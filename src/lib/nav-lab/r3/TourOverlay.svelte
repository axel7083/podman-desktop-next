<script lang="ts">
/**
 * P13 guided tour overlay (coach marks): spotlight on the step target (clicks
 * pass through), a callout "Step n of N — why" with Back / Show me / Next /
 * Exit. A step advances when its `done` condition holds or when its target is
 * clicked; "Show me" performs each step after a short delay. Tours:
 * `r3/tours.svelte.ts`.
 */
import { faCircleCheck, faPause, faPlay, faXmark } from '@fortawesome/free-solid-svg-icons';

import AppIcon from '#lib/components/AppIcon.svelte';

import LabIcon from '../ui/LabIcon.svelte';
import ActBtn from './ActBtn.svelte';
import Btn from './Btn.svelte';
import { exitTour, findTarget, findTour, tour, type TourStep } from './tours.svelte.ts';

const t = $derived(findTour(tour.id));
const step = $derived(t?.steps[tour.i]);
const n = $derived(t?.steps.length ?? 0);

let rect = $state<{ x: number; y: number; w: number; h: number } | undefined>(undefined);
let ch = $state(160);

/* Per-step runtime (not reactive). */
let cur: TourStep | undefined;
let el: HTMLElement | undefined;
let enteredAt = 0;
let foundAt = 0;
let acted = false;
let clicked = false;
let reEnsured = false;
let scrolled = false;

const SHOWME_DELAY = 700;

function ensure(s: TourStep): void {
  try {
    t?.ensure?.();
    s.ensure?.();
  } catch (e: unknown) {
    console.warn('tour ensure', e);
  }
}

function advance(): void {
  if (!t) return;
  tour.hold = false;
  if (tour.i >= t.steps.length - 1) {
    tour.done = true;
    tour.showme = false;
    rect = undefined;
  } else tour.i++;
}

function perform(s: TourStep, target: HTMLElement): void {
  // A disabled button (task still running, "Waiting…"): retry on the next tick.
  if (target instanceof HTMLButtonElement && target.disabled) return;
  acted = true;
  (s.act ?? ((x: HTMLElement): void => x.click()))(target);
  if (!s.done) clicked = true;
}

function tick(): void {
  const s = step;
  if (!t || !s || tour.done) return;
  const now = Date.now();
  if (s !== cur) {
    cur = s;
    enteredAt = now;
    foundAt = 0;
    acted = clicked = reEnsured = scrolled = false;
    ensure(s);
  }
  if (!tour.hold && s.done?.()) return advance();
  if (clicked && !s.done) return advance();
  el = findTarget(s);
  if (!el) {
    rect = undefined;
    foundAt = 0;
    if (s.optional && now - enteredAt > 1500) return advance();
    if (!reEnsured && now - enteredAt > 3000) {
      reEnsured = true;
      ensure(s);
    }
    return;
  }
  if (!foundAt) foundAt = now;
  if (!scrolled) {
    scrolled = true;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  const r = el.getBoundingClientRect();
  rect = { x: r.left, y: r.top, w: r.width, h: r.height };
  if (!tour.showme) return;
  const kind = s.kind ?? 'click';
  if (kind === 'info' && now - foundAt > SHOWME_DELAY * 2) return advance();
  if (kind === 'click' && !acted && now - foundAt > SHOWME_DELAY) perform(s, el);
}

$effect(() => {
  if (!tour.id) return;
  const iv = setInterval(tick, 120);
  const onclick = (e: Event): void => {
    if (el && e.target instanceof Node && el.contains(e.target)) {
      clicked = true;
      tour.hold = false;
    }
  };
  document.addEventListener('click', onclick, true);
  document.addEventListener('contextmenu', onclick, true);
  return (): void => {
    clearInterval(iv);
    document.removeEventListener('click', onclick, true);
    document.removeEventListener('contextmenu', onclick, true);
    cur = el = undefined;
    rect = undefined;
  };
});

function next(): void {
  const s = step;
  if (!s) return;
  const kind = s.kind ?? 'click';
  if (kind !== 'click' || (!tour.hold && s.done?.()) || !el) return advance();
  tour.hold = false;
  perform(s, el);
}

function back(): void {
  if (tour.i === 0) return;
  tour.showme = false;
  tour.hold = true;
  tour.i--;
}

const pos = $derived.by(() => {
  const W = 340;
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 900 : window.innerHeight;
  if (!rect || tour.done) return { left: vw - W - 24, top: vh - ch - 48 };
  const left = Math.max(8, Math.min(rect.x, vw - W - 8));
  const below = rect.y + rect.h + 12;
  const top = below + ch < vh - 8 ? below : Math.max(8, rect.y - ch - 12);
  return { left, top };
});
</script>

{#if t && step}
  <div data-testid="tour-overlay" data-tour={t.id} data-step={tour.i} data-done={tour.done ? 'true' : 'false'} class="fixed inset-0 z-[150] pointer-events-none">
    {#if rect && !tour.done}
      <div
        data-testid="tour-spotlight"
        class="absolute rounded-md transition-all duration-150"
        style:left="{rect.x - 4}px"
        style:top="{rect.y - 4}px"
        style:width="{rect.w + 8}px"
        style:height="{rect.h + 8}px"
        style:box-shadow="0 0 0 2px var(--pd-tab-highlight), 0 0 0 9999px rgba(0, 0, 0, 0.35)">
      </div>
    {/if}
    <div
      data-testid="tour-callout"
      role="dialog"
      aria-label="Tour: {t.title}"
      bind:clientHeight={ch}
      class="absolute w-[340px] flex flex-col gap-2 p-4 rounded-lg pointer-events-auto bg-[var(--pd-content-card-bg)] border border-[var(--pd-content-divider)] shadow-xl text-[13px]"
      style:left="{pos.left}px"
      style:top="{pos.top}px">
      <div class="flex items-center gap-2">
        <span class="flex items-center gap-1">{#each t.logos as [icon, name] (icon)}<span title={name}><LabIcon {icon} size={14} /></span>{/each}</span>
        <span class="flex-1 truncate text-[11px] text-[var(--pd-table-body-text)]">Tour · {t.title}</span>
        <span data-testid="tour-exit-x"><ActBtn icon={faXmark} label="Exit tour" onclick={exitTour} /></span>
      </div>
      {#if tour.done}
        <div class="flex items-center gap-2 text-[14px] font-semibold text-[var(--pd-content-header)]"><span class="text-[var(--pd-status-running)]"><AppIcon icon={faCircleCheck} /></span>Done</div>
        <div class="text-[var(--pd-table-body-text)]">{t.outcome}</div>
        <div class="flex justify-end pt-1"><Btn kind="primary" testid="tour-exit" onclick={exitTour}>Close</Btn></div>
      {:else}
        <div data-testid="tour-step" class="text-[14px] font-semibold text-[var(--pd-content-header)]">Step {tour.i + 1} of {n} — {step.title}</div>
        <div class="text-[var(--pd-table-body-text)]">{step.why}</div>
        {#if !rect}<div class="text-[11px] text-[var(--pd-table-body-text)]">Getting things ready…</div>{/if}
        <div class="flex items-center gap-2 pt-1">
          <Btn testid="tour-exit" onclick={exitTour}>Exit</Btn>
          <span class="flex-1"></span>
          <Btn testid="tour-back" disabled={tour.i === 0} onclick={back}>Back</Btn>
          <Btn testid="tour-showme" icon={tour.showme ? faPause : faPlay} onclick={(): void => void (tour.showme = !tour.showme)}>{tour.showme ? 'Pause' : 'Show me'}</Btn>
          <Btn kind="primary" testid="tour-next" onclick={next}>{tour.i === n - 1 ? 'Finish' : 'Next'}</Btn>
        </div>
      {/if}
    </div>
  </div>
{/if}
