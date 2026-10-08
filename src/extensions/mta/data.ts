/**
 * Mock MTA 8.1 / kantra data, shaped like kantra's `output.yaml`
 * (`violations: {<ruleID>: {description, category, labels, incidents, links, effort}}`)
 * plus the analysis runs and AI-fix state of the "Migration toolkit" tool.
 *
 * Read accessors (`analyses`, `findAnalysis`, `reportRules`, `summary`…) are
 * pure reads of `world.ext` and safe inside `$derived`; writers (`startAnalysis`,
 * `generateFix`, `acceptFix`…) are only called from event handlers / task callbacks.
 */
import { mkContainer } from '#lib/ext/helpers.ts';
import { extData, later, runTask, toast, world, type TaskStep } from '#lib/world.svelte.ts';

import { ENGINE } from '../_appdev/services.ts';

export const MTA_EXT = 'redhat.mta';
export const PROVIDER_IMAGE = 'quay.io/konveyor/java-external-provider:latest';
export const PROVIDER_CONTAINER = 'kjqvxmhtrapzlewc';
export const ANALYSIS_LABEL = 'konveyor.io/analysis';
export const WAR_PATH = '~/dev/inventory-service/target/inventory-service.war';
const ROOT = 'file:///home/maya/dev/inventory-service/';

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export interface Project {
  name: string;
  path: string;
  stack: string;
  build: string;
}

export const PROJECTS: Project[] = [
  {
    name: 'inventory-service',
    path: '~/dev/inventory-service',
    stack: 'Jakarta EE / JBoss EAP 7.4 WAR (Java EE 8, RH-SSO 7.6 adapter, JMS, Infinispan)',
    build: 'Maven · packaging war',
  },
  { name: 'acme-orders', path: '~/dev/acme-orders', stack: 'Red Hat build of Quarkus 3.33', build: 'Maven · quarkus-maven-plugin' },
];

export const SOURCES = [
  { value: 'eap7', label: 'eap7 (JBoss EAP 7)' },
  { value: 'eap6', label: 'eap6 (JBoss EAP 6)' },
  { value: 'javaee', label: 'javaee (Java EE)' },
  { value: 'weblogic', label: 'weblogic (Oracle WebLogic)' },
  { value: 'websphere', label: 'websphere (IBM WebSphere)' },
  { value: 'springboot', label: 'springboot (Spring Boot)' },
];

export const TARGETS: { id: string; label: string }[] = [
  { id: 'eap8', label: 'JBoss EAP 8' },
  { id: 'quarkus', label: 'Quarkus' },
  { id: 'openjdk21', label: 'OpenJDK 21' },
  { id: 'cloud-readiness', label: 'Cloud readiness' },
];

export function targetLabel(id: string): string {
  return TARGETS.find(t => t.id === id)?.label ?? id;
}

/* ------------------------------------------------------------------ */
/* Rules (output.yaml violations)                                      */
/* ------------------------------------------------------------------ */

export type Category = 'mandatory' | 'optional' | 'potential';

export interface Incident {
  uri: string;
  lineNumber: number;
  message: string;
}

export interface Violation {
  ruleId: string;
  description: string;
  category: Category;
  /** Effort per incident (1 trivial … 13 architectural). */
  effort: number;
  /** `konveyor.io/target=…` / `konveyor.io/source=…` labels. */
  labels: string[];
  /** Total incidents found (the sample below may be shorter). */
  incidentCount: number;
  incidents: Incident[];
  links?: { url: string; title: string }[];
  /** Story points reported for the rule (mocked so the scenario totals hold). */
  storyPoints: number;
}

export const CATEGORIES: Category[] = ['mandatory', 'optional', 'potential'];

function t(...targets: string[]): string[] {
  return ['konveyor.io/source=eap7', ...targets.map(x => `konveyor.io/target=${x}`)];
}

function inc(path: string, lineNumber: number, message: string): Incident {
  return { uri: ROOT + path, lineNumber, message };
}

const JAVA = 'src/main/java/com/acme/inventory/';
const EAP_DOCS = 'https://docs.redhat.com/en/documentation/red_hat_jboss_enterprise_application_platform/8.1/html/migration_guide';

/** inventory-service violations across the eap8, quarkus, openjdk21 and cloud-readiness rulesets. */
export const VIOLATIONS: Violation[] = [
  // ---- eap8 mandatory (14 rules, 48 points) ----
  {
    ruleId: 'javaee-to-jakarta-namespaces-00001',
    description: 'Replace the Java EE namespace, schemaLocation and version with the Jakarta EE 10 equivalent',
    category: 'mandatory',
    effort: 1,
    labels: t('eap8', 'jakarta-ee9+', 'quarkus'),
    incidentCount: 212,
    storyPoints: 8,
    incidents: [
      inc('src/main/webapp/WEB-INF/web.xml', 2, 'Replace `http://xmlns.jcp.org/xml/ns/javaee` with `https://jakarta.ee/xml/ns/jakartaee`'),
      inc('src/main/resources/META-INF/persistence.xml', 2, 'Replace the persistence namespace and set version 3.1'),
      inc('src/main/webapp/WEB-INF/beans.xml', 2, 'Replace the CDI namespace and set version 4.0'),
      inc(`${JAVA}StockResource.java`, 4, 'Replace `javax.ws.rs` with `jakarta.ws.rs`'),
      inc(`${JAVA}StockService.java`, 6, 'Replace `javax.ejb` with `jakarta.ejb`'),
    ],
    links: [{ url: 'https://jakarta.ee/specifications/', title: 'Jakarta EE Specifications' }],
  },
  {
    ruleId: 'javax-to-jakarta-dependencies-00001',
    description: "The 'javax' groupId has been replaced by 'jakarta' group id in dependencies.",
    category: 'mandatory',
    effort: 1,
    labels: t('eap8', 'quarkus'),
    incidentCount: 5,
    storyPoints: 5,
    incidents: [
      inc('pom.xml', 58, 'Replace groupId javax with jakarta.platform (jakarta.jakartaee-api 10.0.0)'),
      inc('pom.xml', 64, 'Replace javax.jms:javax.jms-api with jakarta.jms:jakarta.jms-api 3.1.0'),
      inc('pom.xml', 70, 'Replace javax.xml.bind:jaxb-api with jakarta.xml.bind:jakarta.xml.bind-api 4.0.2'),
    ],
  },
  {
    ruleId: 'javax-to-jakarta-import-00001',
    description: "The package 'javax' has been replaced by 'jakarta'.",
    category: 'mandatory',
    effort: 1,
    labels: t('eap8', 'quarkus'),
    incidentCount: 148,
    storyPoints: 3,
    incidents: [
      inc(`${JAVA}ReservationListener.java`, 7, 'Replace `javax.jms.MessageListener` with `jakarta.jms.MessageListener`'),
      inc(`${JAVA}StockService.java`, 8, 'Replace `javax.persistence.EntityManager` with `jakarta.persistence.EntityManager`'),
    ],
  },
  {
    ruleId: 'keycloak-openid-00001',
    description: "Update the 'auth-method' configuration from KEYCLOAK to OIDC",
    category: 'mandatory',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/web.xml', 41, 'The KEYCLOAK auth-method is not supported in EAP 8; use OIDC with elytron-oidc-client')],
    links: [{ url: 'https://docs.redhat.com/en/documentation/red_hat_jboss_enterprise_application_platform/8.1/html/using_single_sign-on_with_jboss_eap', title: 'Using SSO with JBoss EAP' }],
  },
  {
    ruleId: 'keycloak-openid-00010',
    description: 'Rename the keycloak.json configuration file to oidc.json',
    category: 'mandatory',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/keycloak.json', 1, 'Rename keycloak.json to oidc.json')],
  },
  {
    ruleId: 'eap8-ejb-00001',
    description: 'jboss-ejb-client.properties is no longer supported; configure remote EJB clients in wildfly-config.xml',
    category: 'mandatory',
    effort: 3,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 3,
    incidents: [inc('src/main/resources/jboss-ejb-client.properties', 1, 'Move remote.connections and remote.connection.default.* to wildfly-config.xml')],
    links: [{ url: EAP_DOCS, title: 'JBoss EAP 8.1 migration guide' }],
  },
  {
    ruleId: 'legacy-security-00001',
    description: 'PicketBox security domains were removed; migrate to an Elytron application-security-domain',
    category: 'mandatory',
    effort: 5,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 5,
    incidents: [inc('src/main/webapp/WEB-INF/jboss-web.xml', 4, '<security-domain>inventory-domain</security-domain> refers to a legacy PicketBox domain')],
  },
  {
    ruleId: 'hibernate6-00010',
    description: 'Hibernate ORM 6: the legacy org.hibernate.Criteria API was removed',
    category: 'mandatory',
    effort: 3,
    labels: t('eap8', 'quarkus'),
    incidentCount: 2,
    storyPoints: 6,
    incidents: [
      inc(`${JAVA}StockRepository.java`, 37, 'session.createCriteria(StockItem.class) → use the JPA CriteriaBuilder'),
      inc(`${JAVA}StockRepository.java`, 59, 'Restrictions.eq("warehouse", id) → CriteriaBuilder.equal'),
    ],
  },
  {
    ruleId: 'resteasy-legacy-client-00001',
    description: 'The RESTEasy 2 client API (org.jboss.resteasy.client.ClientRequest) was removed',
    category: 'mandatory',
    effort: 3,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 3,
    incidents: [inc(`${JAVA}PricingClient.java`, 21, 'Use the Jakarta REST client API (ClientBuilder) or MicroProfile REST Client')],
  },
  {
    ruleId: 'eap8-module-00001',
    description: 'Module org.picketbox referenced in jboss-deployment-structure.xml no longer exists',
    category: 'mandatory',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/jboss-deployment-structure.xml', 9, 'Remove <module name="org.picketbox"/>')],
  },
  {
    ruleId: 'localhost-jdbc-00002',
    description: 'Localhost JDBC connection',
    category: 'mandatory',
    effort: 7,
    labels: t('cloud-readiness', 'eap8', 'quarkus'),
    incidentCount: 1,
    storyPoints: 7,
    incidents: [inc('src/main/resources/META-INF/persistence.xml', 14, 'jdbc:postgresql://localhost:5432/inventory: use a service name or env var')],
  },
  {
    ruleId: 'jakarta-servlet-00001',
    description: 'Servlet 6.0 removed HttpSessionContext and SingleThreadModel',
    category: 'mandatory',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}LegacyExportServlet.java`, 15, 'LegacyExportServlet implements SingleThreadModel')],
  },
  {
    ruleId: 'resteasy-jackson-provider-00001',
    description: 'resteasy-jackson-provider (Jackson 1) was removed; use resteasy-jackson2-provider',
    category: 'mandatory',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 2,
    storyPoints: 2,
    incidents: [
      inc(`${JAVA}StockItem.java`, 5, 'org.codehaus.jackson.annotate.JsonIgnore → com.fasterxml.jackson.annotation.JsonIgnore'),
      inc('src/main/webapp/WEB-INF/jboss-deployment-structure.xml', 12, 'Exclude org.jboss.resteasy.resteasy-jackson-provider'),
    ],
  },
  {
    ruleId: 'infinispan-api-00001',
    description: 'Infinispan 14: ConfigurationBuilder#eviction() was removed; use memory()',
    category: 'mandatory',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 2,
    storyPoints: 2,
    incidents: [inc(`${JAVA}CacheProducer.java`, 28, '.eviction().strategy(LRU).size(10000) → .memory().maxCount(10000)'), inc(`${JAVA}CacheProducer.java`, 41, '.eviction().type(MEMORY) → .memory().maxSize("64MB")')],
  },
  // ---- eap8 optional (9 rules, 11 points) ----
  {
    ruleId: 'embedded-cache-libraries-01000',
    description: 'Embedded Infinispan cache: caches are not shared between replicas in a cloud environment; consider Red Hat Data Grid',
    category: 'optional',
    effort: 1,
    labels: t('cloud-readiness', 'eap8', 'quarkus'),
    incidentCount: 2,
    storyPoints: 2,
    incidents: [inc('pom.xml', 88, 'org.infinispan:infinispan-core (embedded)'), inc(`${JAVA}CacheProducer.java`, 19, 'new DefaultCacheManager(...)')],
  },
  {
    ruleId: 'eap_channel_manifest_8_0_upgrade-00001',
    description: 'Provision with the JBoss EAP 8.1 channel manifest instead of a fixed feature-pack version',
    category: 'optional',
    effort: 1,
    labels: t('eap8', 'eap81'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('pom.xml', 132, 'Use <channels> org.jboss.eap.channels:eap-8.1 in the eap-maven-plugin')],
  },
  {
    ruleId: 'eap8-microprofile-health-00001',
    description: 'Expose liveness and readiness probes with the microprofile-health layer',
    category: 'optional',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}HealthServlet.java`, 12, 'Custom /health servlet can be replaced by MicroProfile Health')],
  },
  {
    ruleId: 'cdi-beans-xml-00001',
    description: "CDI 4: an empty beans.xml now means bean-discovery-mode 'annotated'",
    category: 'optional',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/beans.xml', 1, 'Set bean-discovery-mode="all" explicitly or annotate beans')],
  },
  {
    ruleId: 'log4j-to-jboss-logging-00001',
    description: 'log4j.xml is ignored by the server; configure the logging subsystem instead',
    category: 'optional',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/resources/log4j.xml', 1, 'Move appenders to the logging subsystem (or set add-logging-api-dependencies)')],
  },
  {
    ruleId: 'hibernate6-00030',
    description: 'hibernate.dialect PostgreSQL82Dialect is deprecated; remove the property',
    category: 'optional',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/resources/META-INF/persistence.xml', 18, 'Hibernate 6 detects the dialect from the JDBC metadata')],
  },
  {
    ruleId: 'session-replication-00001',
    description: '<distributable/> HTTP session replication requires the web-clustering layer',
    category: 'optional',
    effort: 1,
    labels: t('cloud-readiness', 'eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/web.xml', 8, '<distributable/>')],
  },
  {
    ruleId: 'jaxrs-application-path-00001',
    description: 'Prefer @ApplicationPath over a servlet mapping for javax.ws.rs.core.Application',
    category: 'optional',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/web.xml', 22, '<servlet-mapping> for javax.ws.rs.core.Application')],
  },
  {
    ruleId: 'eap8-jms-remote-activemq-00001',
    description: 'Use a pooled connection factory to an external AMQ broker (remote-activemq layer)',
    category: 'optional',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 2,
    storyPoints: 2,
    incidents: [inc(`${JAVA}ReservationPublisher.java`, 14, '@Resource(lookup = "java:/JmsXA")'), inc(`${JAVA}ReservationListener.java`, 12, '@ActivationConfigProperty(destinationLookup = "java:/jms/queue/reservations")')],
  },
  // ---- eap8 potential (5 rules, 4 points) ----
  {
    ruleId: 'jboss-web-xml-valve-00001',
    description: 'Undertow <valve> in jboss-web.xml: check that the handler still exists',
    category: 'potential',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/webapp/WEB-INF/jboss-web.xml', 9, '<valve><class-name>io.undertow.server.handlers.RequestDumpingHandler</class-name></valve>')],
  },
  {
    ruleId: 'serialization-filter-00001',
    description: 'Remote EJB with Java serialization: JDK 17+ requires a deserialization filter (jdk.serialFilter)',
    category: 'potential',
    effort: 1,
    labels: t('eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}StockSnapshot.java`, 9, 'StockSnapshot implements Serializable and is returned by a @Remote bean')],
  },
  {
    ruleId: 'jdk-removed-api-00010',
    description: 'sun.misc.BASE64Encoder was removed in JDK 9; use java.util.Base64',
    category: 'potential',
    effort: 1,
    labels: t('eap8', 'openjdk21'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}ExportSigner.java`, 31, 'new sun.misc.BASE64Encoder().encode(digest)')],
  },
  {
    ruleId: 'system-properties-00001',
    description: 'jboss.server.data.dir points to an ephemeral path in container images',
    category: 'potential',
    effort: 1,
    labels: t('cloud-readiness', 'eap8'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}ExportService.java`, 24, 'System.getProperty("jboss.server.data.dir")')],
  },
  {
    ruleId: 'local-storage-00001',
    description: 'File system usage: mount a volume for exports',
    category: 'potential',
    effort: 0,
    labels: t('cloud-readiness', 'eap8'),
    incidentCount: 1,
    storyPoints: 0,
    incidents: [inc(`${JAVA}ExportService.java`, 30, 'new File("/var/inventory/exports")')],
  },
  // ---- quarkus only (97 more points → 128) ----
  {
    ruleId: 'jms-to-reactive-quarkus-00000',
    description: 'JMS is not supported in Quarkus',
    category: 'mandatory',
    effort: 5,
    labels: t('quarkus'),
    incidentCount: 4,
    storyPoints: 20,
    incidents: [
      inc(`${JAVA}ReservationListener.java`, 7, 'Usage of JMS is not supported in Quarkus. Use Quarkus Messaging (SmallRye Reactive Messaging) with the AMQP connector'),
      inc(`${JAVA}ReservationPublisher.java`, 5, 'javax.jms.ConnectionFactory → @Channel Emitter<Reservation>'),
    ],
  },
  {
    ruleId: 'jms-to-reactive-quarkus-00010',
    description: '@MessageDriven must be replaced with @Incoming',
    category: 'mandatory',
    effort: 3,
    labels: t('quarkus'),
    incidentCount: 3,
    storyPoints: 9,
    incidents: [inc(`${JAVA}ReservationListener.java`, 10, '@MessageDriven(activationConfig = …) → @Incoming("reservations")')],
  },
  {
    ruleId: 'remote-ejb-to-quarkus-00000',
    description: 'Remote EJBs are not supported in Quarkus',
    category: 'mandatory',
    effort: 5,
    labels: t('quarkus'),
    incidentCount: 2,
    storyPoints: 10,
    incidents: [inc(`${JAVA}StockFacade.java`, 11, '@Remote interface: expose a REST or gRPC endpoint instead')],
  },
  {
    ruleId: 'keycloak-adapter-to-quarkus-oidc-00000',
    description: 'Replace the RH-SSO adapter with quarkus-oidc',
    category: 'mandatory',
    effort: 3,
    labels: t('quarkus'),
    incidentCount: 2,
    storyPoints: 6,
    incidents: [inc('src/main/webapp/WEB-INF/web.xml', 41, 'Configure quarkus.oidc.auth-server-url and roles in application.properties')],
  },
  {
    ruleId: 'infinispan-to-quarkus-00000',
    description: 'Embedded Infinispan is not supported; use quarkus-infinispan-client against Data Grid',
    category: 'mandatory',
    effort: 5,
    labels: t('quarkus'),
    incidentCount: 2,
    storyPoints: 10,
    incidents: [inc(`${JAVA}CacheProducer.java`, 19, 'new DefaultCacheManager(...) → @Inject RemoteCacheManager')],
  },
  {
    ruleId: 'cdi-to-quarkus-00040',
    description: '@Produces of EJB resources (@Resource) must be replaced with CDI producers',
    category: 'mandatory',
    effort: 3,
    labels: t('quarkus'),
    incidentCount: 5,
    storyPoints: 15,
    incidents: [inc(`${JAVA}Resources.java`, 14, '@Produces @Resource(lookup = "java:jboss/datasources/InventoryDS")')],
  },
  {
    ruleId: 'ejb-timer-to-quarkus-00000',
    description: '@Schedule must be replaced with the quarkus-scheduler @Scheduled annotation',
    category: 'mandatory',
    effort: 3,
    labels: t('quarkus'),
    incidentCount: 2,
    storyPoints: 6,
    incidents: [inc(`${JAVA}StockReconciler.java`, 18, '@Schedule(hour = "*/1") → @Scheduled(cron = "0 0 * * * ?")')],
  },
  {
    ruleId: 'persistence-to-quarkus-00000',
    description: 'Move persistence.xml configuration to application.properties',
    category: 'optional',
    effort: 3,
    labels: t('quarkus'),
    incidentCount: 1,
    storyPoints: 3,
    incidents: [inc('src/main/resources/META-INF/persistence.xml', 1, 'quarkus.datasource.* and quarkus.hibernate-orm.*')],
  },
  {
    ruleId: 'javaee-pom-to-quarkus-00000',
    description: 'Adopt the Quarkus BOM',
    category: 'mandatory',
    effort: 1,
    labels: t('quarkus'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('pom.xml', 40, 'Import com.redhat.quarkus.platform:quarkus-bom 3.33.0.redhat-00001')],
  },
  {
    ruleId: 'javaee-pom-to-quarkus-00010',
    description: 'Adopt the Quarkus Maven plugin',
    category: 'mandatory',
    effort: 1,
    labels: t('quarkus'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('pom.xml', 120, 'Add io.quarkus.platform:quarkus-maven-plugin')],
  },
  {
    ruleId: 'javaee-pom-to-quarkus-00020',
    description: 'Adopt the Maven Compiler plugin with release 21',
    category: 'mandatory',
    effort: 1,
    labels: t('quarkus'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('pom.xml', 118, '<maven.compiler.release>21</maven.compiler.release>')],
  },
  {
    ruleId: 'jaxrs-to-quarkus-00020',
    description: 'The javax.ws.rs.core.Application subclass is not needed in Quarkus',
    category: 'optional',
    effort: 1,
    labels: t('quarkus'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}InventoryApplication.java`, 8, 'Remove InventoryApplication or keep it only for @ApplicationPath')],
  },
  {
    ruleId: 'ee-to-quarkus-00000',
    description: '@Stateless annotation must be replaced',
    category: 'potential',
    effort: 1,
    labels: t('quarkus'),
    incidentCount: 11,
    storyPoints: 11,
    incidents: [inc(`${JAVA}StockService.java`, 22, 'Replace @Stateless with a CDI scope such as @ApplicationScoped'), inc(`${JAVA}PricingService.java`, 15, 'Replace @Stateless with @ApplicationScoped')],
  },
  {
    ruleId: 'ee-to-quarkus-00010',
    description: '@Stateful annotation must be replaced',
    category: 'potential',
    effort: 3,
    labels: t('quarkus'),
    incidentCount: 1,
    storyPoints: 3,
    incidents: [inc(`${JAVA}ReservationCart.java`, 13, 'Replace @Stateful with @SessionScoped')],
  },
  // ---- openjdk21 / cloud-readiness only ----
  {
    ruleId: 'removed-javaee-modules-00000',
    description: 'JAXB (javax.xml.bind) was removed from the JDK; add it as a dependency',
    category: 'mandatory',
    effort: 1,
    labels: t('openjdk21'),
    incidentCount: 2,
    storyPoints: 2,
    incidents: [inc(`${JAVA}ExportService.java`, 5, 'import javax.xml.bind.JAXBContext')],
  },
  {
    ruleId: 'security-manager-deprecated-00001',
    description: 'The Security Manager is deprecated for removal (JEP 411)',
    category: 'potential',
    effort: 1,
    labels: t('openjdk21'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc(`${JAVA}ExportSigner.java`, 12, 'System.getSecurityManager()')],
  },
  {
    ruleId: 'logging-0000',
    description: 'Logging to a file: containers should log to standard output',
    category: 'optional',
    effort: 1,
    labels: t('cloud-readiness'),
    incidentCount: 1,
    storyPoints: 1,
    incidents: [inc('src/main/resources/log4j.xml', 12, '<appender class="org.apache.log4j.RollingFileAppender">')],
  },
];

/** Rulesets loaded by kantra for the targets above (14). */
export const RULESETS = [
  'eap8/eap7',
  'eap81/eap8',
  'jakarta-ee/javaee',
  'quarkus/eap7',
  'quarkus/springboot',
  'cloud-readiness',
  'openjdk21/openjdk11',
  'openjdk17/openjdk11',
  'hibernate6',
  'resteasy',
  'infinispan',
  'keycloak',
  'technology-usage',
  'discovery-rules',
];

/* ------------------------------------------------------------------ */
/* Konveyor AI canned solutions                                        */
/* ------------------------------------------------------------------ */

export interface FixProposal {
  model: string;
  explanation: string;
  files: string[];
  diff: string[];
}

export const KEYCLOAK_INCIDENT = 'keycloak-openid-00001@src/main/webapp/WEB-INF/web.xml:41';

export const FIXES: Record<string, FixProposal> = {
  [KEYCLOAK_INCIDENT]: {
    model: 'granite-3.3-8b',
    explanation:
      'The RH-SSO (Keycloak) client adapter was removed in JBoss EAP 8. Switch the login config to OIDC so the elytron-oidc-client subsystem secures the deployment, and move the adapter settings to WEB-INF/oidc.json.',
    files: ['src/main/webapp/WEB-INF/web.xml', 'src/main/webapp/WEB-INF/oidc.json'],
    diff: [
      '--- a/src/main/webapp/WEB-INF/web.xml',
      '+++ b/src/main/webapp/WEB-INF/web.xml',
      '@@ -38,7 +38,7 @@',
      '         </security-constraint>',
      '     <login-config>',
      '-        <auth-method>KEYCLOAK</auth-method>',
      '+        <auth-method>OIDC</auth-method>',
      '         <realm-name>acme</realm-name>',
      '     </login-config>',
      '--- /dev/null',
      '+++ b/src/main/webapp/WEB-INF/oidc.json',
      '@@ -0,0 +1,8 @@',
      '+{',
      '+  "provider-url": "http://localhost:8180/realms/acme",',
      '+  "client-id": "inventory-service",',
      '+  "public-client": false,',
      '+  "ssl-required": "external",',
      '+  "principal-attribute": "preferred_username",',
      '+  "credentials": { "secret": "${env.OIDC_CLIENT_SECRET}" }',
      '+}',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface Analysis {
  id: string;
  project: string;
  input: string;
  source: string;
  targets: string[];
  mode: 'source-only' | 'full';
  runLocal: boolean;
  startedAt: string;
  durationSec?: number;
  status: 'running' | 'completed' | 'failed';
  taskId?: string;
}

export type FixState = 'generating' | 'ready' | 'accepted' | 'rejected';

export interface FixEntry {
  state: FixState;
  taskId?: string;
}

/** All runs, newest first (read-only). */
export function analyses(): Analysis[] {
  return (world.ext[MTA_EXT]?.analyses as Analysis[] | undefined) ?? [];
}

export function findAnalysis(id: string | null | undefined): Analysis | undefined {
  return id ? analyses().find(a => a.id === id) : undefined;
}

/** Latest completed run of a project (read-only). */
export function latestAnalysis(project: string): Analysis | undefined {
  return analyses().find(a => a.project === project && a.status === 'completed');
}

/** Incident keys resolved by accepted fixes (read-only). */
export function resolvedIncidents(): string[] {
  return (world.ext[MTA_EXT]?.resolved as string[] | undefined) ?? [];
}

export function fixes(): Record<string, FixEntry> {
  return (world.ext[MTA_EXT]?.fixes as Record<string, FixEntry> | undefined) ?? {};
}

/** `true` once the RH-SSO auth-method fix was accepted (read by the JBoss EAP extension). */
export function isKeycloakFixed(): boolean {
  return resolvedIncidents().includes(KEYCLOAK_INCIDENT);
}

export function relPath(uri: string): string {
  return uri.replace(ROOT, '');
}

export function incidentKey(v: Violation, i: Incident): string {
  return `${v.ruleId}@${relPath(i.uri)}:${i.lineNumber}`;
}

export function targetsOf(v: Violation): string[] {
  return v.labels.filter(l => l.startsWith('konveyor.io/target=')).map(l => l.slice('konveyor.io/target='.length));
}

/** Violations found by a run, filtered by one target (read-only). */
export function reportRules(a: Analysis, target: string): Violation[] {
  if (a.project !== 'inventory-service' || !a.targets.includes(target)) return [];
  return VIOLATIONS.filter(v => targetsOf(v).includes(target));
}

export function resolvedCount(v: Violation, resolved: string[]): number {
  return v.incidents.filter(i => resolved.includes(incidentKey(v, i))).length;
}

export function pointsOf(v: Violation, resolved: string[]): number {
  return Math.max(0, v.storyPoints - v.effort * resolvedCount(v, resolved));
}

export interface Summary {
  mandatory: number;
  optional: number;
  potential: number;
  incidents: number;
  points: number;
}

export function summary(a: Analysis, target: string, resolved: string[]): Summary {
  const rules = reportRules(a, target);
  return {
    mandatory: rules.filter(r => r.category === 'mandatory').length,
    optional: rules.filter(r => r.category === 'optional').length,
    potential: rules.filter(r => r.category === 'potential').length,
    incidents: rules.reduce((s, r) => s + r.incidentCount - resolvedCount(r, resolved), 0),
    points: rules.reduce((s, r) => s + pointsOf(r, resolved), 0),
  };
}

/* ------------------------------------------------------------------ */
/* Writers (event handlers / task callbacks only)                      */
/* ------------------------------------------------------------------ */

function store(): { analyses: Analysis[]; resolved: string[]; fixes: Record<string, FixEntry> } {
  return {
    analyses: extData<Analysis[]>(MTA_EXT, 'analyses', []),
    resolved: extData<string[]>(MTA_EXT, 'resolved', []),
    fixes: extData<Record<string, FixEntry>>(MTA_EXT, 'fixes', {}),
  };
}

/** Seed: a previous run from three days ago, so the dashboard card has data. */
export function seedAnalyses(): void {
  const s = store();
  if (s.analyses.length) return;
  s.analyses.push({
    id: 'analysis-20261005-1647',
    project: 'inventory-service',
    input: '~/dev/inventory-service',
    source: 'eap7',
    targets: ['eap8', 'quarkus'],
    mode: 'source-only',
    runLocal: true,
    startedAt: '2026-10-05T16:47:31Z',
    durationSec: 94,
    status: 'completed',
  });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function newAnalysisId(): string {
  const taken = new Set(analyses().map(a => a.id));
  if (!taken.has('analysis-20261008-0912')) return 'analysis-20261008-0912';
  const d = new Date();
  const base = `analysis-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export interface AnalyzeOptions {
  input: string;
  source: string;
  targets: string[];
  mode: 'source-only' | 'full';
  hybrid: boolean;
  onDone?: (analysis: Analysis) => void;
}

function removeProvider(): void {
  world.containers = world.containers.filter(c => c.name !== PROVIDER_CONTAINER);
}

/** `kantra analyze` as a task; in hybrid mode the Java provider container lives for the run. */
export function startAnalysis(o: AnalyzeOptions): Analysis {
  const project = o.input.replace(/\/+$/, '').split('/').pop() ?? o.input;
  const id = newAnalysisId();
  const known = project === 'inventory-service';
  const counts = o.targets.map(target => `${VIOLATIONS.filter(v => known && targetsOf(v).includes(target)).length} in ${target}`).join(', ');
  const cmd = [
    `kantra analyze --input=${o.input} --output=${o.input}/.konveyor`,
    `--source ${o.source}`,
    ...o.targets.map(target => `--target ${target}`),
    `--mode ${o.mode}`,
    `--run-local=${!o.hybrid}`,
    '--overwrite',
  ].join(' ');
  const pullMs = 2400;
  const prepMs = 300;
  const steps: TaskStep[] = [
    { label: 'Preparing analysis', ms: prepMs, log: [`$ ${cmd}`, `using container tool podman (podman-machine-default)`] },
    ...(o.hybrid
      ? [
          {
            label: `Pulling ${PROVIDER_IMAGE}`,
            ms: pullMs,
            log: [`Trying to pull ${PROVIDER_IMAGE}...`, 'Getting image source signatures', 'Copying blob sha256:7d1f0a9c3e2b done | 1.1 GB', 'Writing manifest to image destination'],
          },
          {
            label: 'Starting provider container',
            ms: 1300,
            log: [
              'podman volume create xqbtmzlwvhrkdafe',
              `podman run -d --name ${PROVIDER_CONTAINER} -p 6734:6734 -v xqbtmzlwvhrkdafe:/opt/input/source:Z --label ${ANALYSIS_LABEL}=${id} ${PROVIDER_IMAGE} --port 6734`,
              'java provider listening on localhost:6734',
            ],
          },
        ]
      : [{ label: 'Starting Java provider (containerless)', ms: 1500, log: ['running java provider in-process (JDK 21.0.8, Maven 3.9.11)', 'mvn dependency:tree -DoutputType=dot'] }]),
    { label: `Loading rulesets (${RULESETS.length})`, ms: 1300, log: RULESETS.map(r => `loaded ruleset ${r}`) },
    {
      label: 'Evaluating rules 2410/2410',
      ms: 3600,
      log: [
        'evaluating rules for violations. see analysis.log for more info',
        'processed rule 212/2410 javaee-to-jakarta-namespaces-00001',
        'processed rule 1180/2410 keycloak-openid-00001',
        'processed rule 2410/2410 ee-to-quarkus-00010',
        `found violations: ${counts}`,
      ],
    },
    {
      label: 'Writing static report',
      ms: 1100,
      log: [
        `writing analysis results to output file file=${o.input}/.konveyor/output.yaml`,
        `generating static report output=${o.input}/.konveyor/static-report/index.html`,
        ...(o.hybrid ? [`podman rm -f ${PROVIDER_CONTAINER}`, 'podman volume rm xqbtmzlwvhrkdafe'] : []),
      ],
    },
  ];
  const started = Date.now();
  const taskId = runTask({
    name: `kantra analyze ${project}`,
    ext: MTA_EXT,
    steps,
    action: { label: 'Open report', href: `/tools/mta?report=${id}` },
    onDone: () => {
      removeProvider();
      const a = store().analyses.find(x => x.id === id);
      if (!a) return;
      a.status = 'completed';
      a.durationSec = Math.round((Date.now() - started) / 1000);
      o.onDone?.(a);
    },
  });
  const analysis: Analysis = {
    id,
    project,
    input: o.input,
    source: o.source,
    targets: [...o.targets],
    mode: o.mode,
    runLocal: !o.hybrid,
    startedAt: new Date().toISOString(),
    status: 'running',
    taskId,
  };
  store().analyses.unshift(analysis);
  if (o.hybrid) {
    later(prepMs + pullMs, () => {
      const a = store().analyses.find(x => x.id === id);
      if (a?.status !== 'running') return;
      removeProvider();
      world.containers.push(
        mkContainer(ENGINE, {
          name: PROVIDER_CONTAINER,
          image: PROVIDER_IMAGE,
          ports: [[6734, 6734]],
          labels: { [ANALYSIS_LABEL]: id },
          command: '--port 6734',
          ageH: 0,
          upM: 0,
          logs: ['java provider listening on :6734', 'initialized workspace /opt/input/source', 'jdtls: indexed 1,284 classes'],
        }),
      );
    });
  }
  // clean up even if the task was canceled
  const total = steps.reduce((sum, st) => sum + st.ms, 0);
  later(total + 500, () => {
    const task = world.tasks.find(x => x.id === taskId);
    const a = store().analyses.find(x => x.id === id);
    if (a?.status === 'running' && task?.status !== 'in-progress') {
      a.status = 'failed';
      removeProvider();
    }
  });
  return analysis;
}

/** Konveyor AI: generate a solution for an incident (local model served by AI Lab). */
export function generateFix(key: string): void {
  const fix = FIXES[key];
  if (!fix) return;
  const s = store();
  const taskId = runTask({
    name: 'Generating solution',
    ext: MTA_EXT,
    steps: [
      { label: 'Collecting incident context', ms: 700, log: ['incident keycloak-openid-00001 web.xml:41', 'context files: web.xml, keycloak.json, jboss-web.xml'] },
      {
        label: `Prompting ${fix.model} (AI Lab local inference)`,
        ms: 2200,
        log: ['provider ChatOpenAI baseURL=http://localhost:35000/v1 (AI Lab inference server)', `model ${fix.model} · 1,942 prompt tokens`, 'streaming response… 418 tokens'],
      },
      { label: 'Validating the proposed diff', ms: 600, log: ['2 files changed, 9 insertions(+), 1 deletion(-)'] },
    ],
    onDone: () => {
      const entry = store().fixes[key];
      if (entry?.state === 'generating') entry.state = 'ready';
    },
  });
  s.fixes[key] = { state: 'generating', taskId };
}

export function acceptFix(key: string): void {
  const s = store();
  s.fixes[key] = { ...s.fixes[key], state: 'accepted' };
  if (!s.resolved.includes(key)) s.resolved.push(key);
  toast({ type: 'success', title: 'Fix applied', body: `${FIXES[key]?.files.join(' and ')} updated. Incident resolved, 1 story point removed.` });
}

export function rejectFix(key: string): void {
  const s = store();
  s.fixes[key] = { ...s.fixes[key], state: 'rejected' };
  toast({ type: 'info', title: 'Proposed fix rejected' });
}
