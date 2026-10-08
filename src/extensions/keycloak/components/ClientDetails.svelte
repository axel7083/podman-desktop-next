<script lang="ts">
/** Client details: settings, credentials, OIDC endpoints and the Quarkus config to copy. */
import { faCopy, faRotate } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage } from '@podman-desktop/ui-svelte';

import AppIcon from '#lib/components/AppIcon.svelte';
import type { ConnectionView } from '#lib/ext/types.ts';
import { navigate } from '#lib/nav.ts';
import { toast } from '#lib/world.svelte.ts';

import Card from '../../_appdev/Card.svelte';
import CopyField from '../../_appdev/CopyField.svelte';
import KeyValue from '../../_appdev/KeyValue.svelte';
import Pill from '../../_appdev/Pill.svelte';
import { regenerateSecret } from '../actions.ts';
import { clientFlows, clientType, type KcClient, type KcRealm, oidcEndpoints, quarkusConfig } from '../data.ts';

interface Props {
  conn: ConnectionView;
  realm: KcRealm;
  client: KcClient;
}

let { conn, realm, client }: Props = $props();

const ep = $derived(oidcEndpoints(conn.endpoint, realm.realm));
const config = $derived(quarkusConfig(conn.endpoint, realm.realm, client));
const serviceAccount = $derived(realm.users.find(u => u.serviceAccountClientLink === client.clientId));

function close(): void {
  navigate(`/c/${conn.id}/clients?realm=${encodeURIComponent(realm.realm)}`);
}

function copyConfig(): void {
  navigator.clipboard?.writeText(config.join('\n')).catch(() => undefined);
  toast({ type: 'success', title: `Copied ${config.length} properties`, body: 'Paste them into src/main/resources/application.properties.' });
}

function regenerate(): void {
  regenerateSecret(client);
}

function openServiceAccount(): void {
  if (serviceAccount) navigate(`/c/${conn.id}/users?realm=${encodeURIComponent(realm.realm)}&user=${encodeURIComponent(serviceAccount.username)}`);
}
</script>

<DetailsPage
  title={client.clientId}
  subtitle="{client.name ?? client.clientId} · {clientType(client)} · realm {realm.realm}"
  breadcrumbLeftPart="Clients"
  breadcrumbRightPart={client.clientId}
  onclose={close}
  onbreadcrumbClick={close}>
  {#snippet iconSnippet()}<AppIcon icon="icons/redhat.keycloak.svg" size="28px" />{/snippet}
  {#snippet actionsSnippet()}
    {#if !client.publicClient && client.secret}
      <Button type="secondary" icon={faRotate} onclick={regenerate}>Regenerate secret</Button>
    {/if}
    <Button icon={faCopy} onclick={copyConfig}>Copy Quarkus config</Button>
  {/snippet}
  {#snippet contentSnippet()}
    <div class="h-full overflow-auto px-5 py-4 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <Card title="Settings">
          {#snippet actions()}<Pill label={client.enabled ? 'Enabled' : 'Disabled'} tone={client.enabled ? 'success' : 'neutral'} />{/snippet}
          <KeyValue
            rows={[
              ['Client ID', client.clientId],
              ['Name', client.name],
              ['Protocol', client.protocol],
              ['Client authentication', client.publicClient ? 'Off (public client)' : 'On (confidential)'],
              ['Authenticator', client.clientAuthenticatorType],
              ['Authentication flows', clientFlows(client).join(', ') || 'None'],
              ['PKCE method', client.attributes?.['pkce.code.challenge.method']],
              ['Valid redirect URIs', client.redirectUris.join(', ')],
              ['Web origins', client.webOrigins?.join(', ')],
            ]} />
        </Card>
        <Card title="Credentials" subtitle={client.publicClient ? 'Public clients have no secret: use PKCE.' : 'Client secret (client-secret authenticator)'}>
          {#if !client.publicClient && client.secret}
            <CopyField label="Client secret" value={client.secret} toastTitle="Copied the client secret" />
          {/if}
          {#if serviceAccount}
            <div class="mt-3 text-sm">
              Service account user
              <button class="text-[var(--pd-link)] hover:underline" onclick={openServiceAccount}>{serviceAccount.username}</button>
              with roles {serviceAccount.realmRoles.filter(r => !r.startsWith('default-roles')).join(', ')}
            </div>
          {/if}
        </Card>
      </div>
      <Card title="Endpoints" subtitle="OpenID Connect discovery for realm {realm.realm}">
        <div class="space-y-3">
          <CopyField label="OpenID configuration" value={ep.wellKnown} toastTitle="Copied the well-known URL" />
          <KeyValue labelWidth="w-48" rows={[['Issuer', ep.issuer], ['Authorization endpoint', ep.authorization], ['Token endpoint', ep.token], ['Userinfo endpoint', ep.userinfo], ['JWKS URI', ep.jwks], ['End session endpoint', ep.endSession]]} />
        </div>
      </Card>
      <Card title="Quarkus config" subtitle="application.properties for quarkus-oidc">
        {#snippet actions()}<Button type="secondary" icon={faCopy} onclick={copyConfig} aria-label="Copy properties">Copy</Button>{/snippet}
        <pre class="text-xs font-mono rounded-md p-3 bg-[var(--pd-content-card-inset-bg)] overflow-auto" aria-label="Quarkus config">{config.join('\n')}</pre>
      </Card>
    </div>
  {/snippet}
</DetailsPage>
