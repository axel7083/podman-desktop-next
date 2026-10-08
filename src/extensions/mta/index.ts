/**
 * redhat.mta (proposed) – Migration Toolkit for Applications 8.1 (kantra):
 * a Migration toolkit tool page (P3) with projects, an analyze task (P15) that
 * runs the Java provider in a transient Podman container (hybrid mode), a
 * report with Konveyor AI fixes served by AI Lab local inference (P9), an
 * EOL image checker (P5) and a dashboard card / CLI tool / command (P17).
 */
import { faMagnifyingGlassChart } from '@fortawesome/free-solid-svg-icons';

import { mkContainer, mkImage } from '#lib/ext/helpers.ts';
import type { Finding, MockExtension } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';

import { ENGINE } from '../_appdev/services.ts';
import { MTA_EXT, seedAnalyses } from './data.ts';

const MIGRATION_GUIDE = 'https://docs.redhat.com/en/documentation/red_hat_jboss_enterprise_application_platform/8.1/html/migration_guide';
const EAP7_IMAGE = 'registry.redhat.io/jboss-eap-7/eap74-openjdk11-openshift-rhel8';

function eolFindings(): Finding[] {
  return [
    {
      id: 'eap7-eol-00001',
      ruleId: 'eap7-eol-00001',
      title: 'JBoss EAP 7.4 reaches end of maintenance; migrate to EAP 8.1',
      severity: 'high',
      package: 'eap7.4',
      installed: '7.4.22',
      fixedIn: '8.1.2.GA',
      description: 'Run "Analyze application with MTA" with source eap7 and target eap8 to size the migration.',
      advisoryUrl: 'https://access.redhat.com/support/policy/updates/jboss_notes',
    },
    {
      id: 'keycloak-adapter-00001',
      ruleId: 'keycloak-adapter-00001',
      title: 'RH-SSO (Keycloak) client adapter is removed in EAP 8; use elytron-oidc-client',
      severity: 'medium',
      package: 'rh-sso-7.6-eap7-adapter',
      installed: '7.6.11',
      description: 'Deployments using <auth-method>KEYCLOAK</auth-method> must switch to OIDC and oidc.json.',
      advisoryUrl: 'https://docs.redhat.com/en/documentation/red_hat_jboss_enterprise_application_platform/8.1/html/using_single_sign-on_with_jboss_eap',
    },
    {
      id: 'openjdk11-eol-00001',
      ruleId: 'openjdk11-eol-00001',
      title: 'OpenJDK 11 runtime: EAP 8.1 images ship OpenJDK 17 and 21',
      severity: 'medium',
      package: 'java-11-openjdk-headless',
      installed: '11.0.25',
      fixedIn: '21.0.8',
      advisoryUrl: MIGRATION_GUIDE,
    },
  ];
}

const extension: MockExtension = {
  id: MTA_EXT,
  displayName: 'Migration Toolkit for Applications',
  publisher: 'redhat',
  description: 'Analyze an application with kantra/MTA rulesets for a migration target, browse issues by effort, and apply Konveyor AI fixes.',
  version: '8.1.1',
  icon: 'icons/redhat.mta.svg',
  tags: ['appdev'],
  pApis: ['P3', 'P5', 'P9', 'P15', 'P17'],
  contributes: {
    tools: [{ id: 'mta', label: 'MTA', icon: 'icons/redhat.mta.svg', description: 'Analyze applications for EAP 8, Quarkus and cloud readiness', component: () => import('./components/MtaTool.svelte') }],
    imageCheckers: [
      {
        id: 'mta-eol',
        label: 'MTA lifecycle check',
        description: 'Lifecycle and migration hints from the MTA eap8 rulesets.',
        durationMs: 900,
        when: image => image.name.includes('eap74') || image.name.includes('jboss-eap-7'),
        check: eolFindings,
      },
    ],
    cliTools: [
      {
        id: 'kantra',
        name: 'mta-cli',
        displayName: 'MTA CLI (kantra)',
        description: 'Migration Toolkit for Applications CLI: kantra analyze, transform and rules.',
        version: '8.1.1',
        latest: '8.1.1',
        path: '/home/maya/.local/bin/mta-cli',
      },
    ],
    dashboardCards: [{ id: 'mta-readiness', title: 'Migration readiness', component: () => import('./components/MigrationCard.svelte') }],
    commands: [
      {
        id: 'mta.analyze',
        title: 'Analyze application with MTA',
        category: 'MTA',
        icon: faMagnifyingGlassChart,
        run: (): void => navigate('/tools/mta?view=analyze'),
      },
    ],
  },
  seed(world): void {
    world.images.push(mkImage(ENGINE, { name: EAP7_IMAGE, tag: '7.4.22', sizeMB: 780_000_000 / (1024 * 1024), ageD: 210, base: 'ubi8', labels: { 'com.redhat.component': 'jboss-eap-74-openjdk11-builder-openshift-rhel8-container', version: '7.4.22' } }));
    world.containers.push(
      mkContainer(ENGINE, {
        name: 'inventory-service-eap7',
        image: `${EAP7_IMAGE}:7.4.22`,
        state: 'EXITED',
        ports: [8080, 9990],
        ageH: 26 * 24,
        logs: ['WFLYSRV0025: JBoss EAP 7.4.22.GA (WildFly Core 15.0.40.Final-redhat-00001) started in 7812ms', 'WFLYSRV0010: Deployed "inventory-service.war" (runtime-name : "inventory-service.war")', 'WFLYSRV0050: JBoss EAP 7.4.22.GA stopped in 214ms'],
      }),
    );
    seedAnalyses();
  },
};

export default extension;
