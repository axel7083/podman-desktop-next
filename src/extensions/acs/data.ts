/**
 * `roxctl image check -o json` mapped to P5 findings. Policy evaluation is a
 * pure function of the image (labels / packages), so a rebuilt image passes.
 */
import type { Finding } from '#lib/ext/types.ts';
import type { ContainerImage } from '#lib/world.svelte.ts';

export const ACS_ID = 'redhat.acs-image-check';
export const CENTRAL = { name: 'acme-prod', endpoint: 'central-stackrox.apps.rosa.ocp-prod.x7k2.p3.openshiftapps.com:443', version: '4.10.0' };

export interface ViolatedPolicy {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  violation: string[];
  remediation: string;
  failingCheck: boolean;
}

function pkg(image: ContainerImage, name: string): string | undefined {
  return image.packages?.find(p => p.name === name)?.version;
}

export function acsCheck(image: ContainerImage): ViolatedPolicy[] {
  const out: ViolatedPolicy[] = [];
  const ssl = pkg(image, 'openssl-libs');
  if (ssl?.endsWith('el9_5')) {
    out.push({
      name: 'Fixable Severity at least Important',
      severity: 'HIGH',
      description: 'Alert on deployments with fixable vulnerabilities with a Severity Rating at least Important',
      violation: [`Fixable CVE-2026-31790 (CVSS 7.5) (severity Important) found in component 'openssl-libs' (version ${ssl}), resolved by version 1:3.2.2-6.el9_6`],
      remediation: 'Use your package manager to update to a fixed version in future builds or speak with your security team to mitigate the vulnerabilities.',
      failingCheck: true,
    });
  }
  if (image.labels?.['io.acme.user'] === 'root') {
    out.push({
      name: 'Docker CIS 4.1: Ensure That a User for the Container Has Been Created',
      severity: 'HIGH',
      description: 'Containers should run as a non-root user',
      violation: [`Container '${image.name.split('/').pop()}' has USER root`],
      remediation: 'Add USER 1001 to the Containerfile.',
      failingCheck: true,
    });
  }
  if (image.labels?.['io.acme.base']?.endsWith(':latest')) {
    out.push({
      name: 'Latest tag',
      severity: 'MEDIUM',
      description: "Alert on deployments with images using tag 'latest'",
      violation: [`Base image '${image.labels['io.acme.base']}'`],
      remediation: 'Pin base image by digest or version tag.',
      failingCheck: false,
    });
  }
  if (pkg(image, 'dnf')) {
    out.push({
      name: 'Red Hat Package Manager in Image',
      severity: 'LOW',
      description: 'Alert on deployments with components of the Red Hat/Fedora/CentOS package management system.',
      violation: [`Image includes component 'dnf' (version ${pkg(image, 'dnf')})`],
      remediation: 'Run `rpm -e $(rpm -qa *dnf*)` in the image build for production containers.',
      failingCheck: false,
    });
  }
  return out;
}

export function failing(image: ContainerImage): ViolatedPolicy[] {
  return acsCheck(image).filter(p => p.failingCheck);
}

export function toFindings(policies: ViolatedPolicy[]): Finding[] {
  return policies.map(p => ({
    id: p.name,
    ruleId: p.name,
    title: `${p.failingCheck ? 'Breaks build · ' : ''}${p.violation[0]}`,
    severity: p.severity.toLowerCase() as Finding['severity'],
    description: `${p.description}. Remediation: ${p.remediation}`,
  }));
}
