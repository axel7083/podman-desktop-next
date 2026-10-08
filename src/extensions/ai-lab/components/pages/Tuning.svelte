<script lang="ts">
/** TUNING section: InstructLab fine-tuning is experimental and off by default (ai-lab.experimentalTuning). */
import { faGaugeHigh } from '@fortawesome/free-solid-svg-icons';
import { EmptyScreen } from '@podman-desktop/ui-svelte';
</script>

<EmptyScreen
  icon={faGaugeHigh}
  title="Fine-tuning is turned off"
  message="Tune with InstructLab is an experimental feature. Enable it in Settings › Preferences › AI Lab › Experimental tuning to create tuning sessions."
  commandline="ilab model train --pipeline simple" />
