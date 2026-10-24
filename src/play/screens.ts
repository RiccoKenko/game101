/**
 * The screens around a battle: the chapter map where levels are picked, the story dialog, the end-of-battle
 * card and the pause menu. Plain DOM over the stage; main.ts decides when each one shows.
 */
import './screens.css';
import { sfx } from '../audio/sfx';
import { assetUrl } from '../puppet/loader';
import { DIFFICULTIES, DIFFICULTY, type Difficulty } from '../td/difficulty';
import type { LevelDef } from '../td/levels';
import type { ChapterMapDef } from './chapterMap';
import { chapterStars, unlockedCount, type Progress } from './progress';
import { SPEAKERS, type Speaker, type StoryLine } from './story';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    void sfx.unlock();
    sfx.play('click', 0.35, 0);
    onClick();
  });
  return b;
}

/** In the single-file build every picture is inlined, so a path that isn't there was never drawn. */
const missing = (path: string) => !!window.__ASSETS__ && !(path in window.__ASSETS__);

const starRow = (n: number, cls = 'star-row') =>
  `<span class="${cls}">${[0, 1, 2].map((i) => `<i class="star${i < n ? ' on' : ''}"></i>`).join('')}</span>`;

// ---------------------------------------------------------------- chapter map

const LOCK = `<svg class="lock" viewBox="0 0 24 28" aria-hidden="true"><path d="M6 12V8a6 6 0 0 1 12 0v4" fill="none" stroke="#5e6378" stroke-width="3.2"/><rect x="2" y="12" width="20" height="15" rx="3" fill="#5e6378"/><circle cx="12" cy="19" r="2.4" fill="#c9ccd8"/></svg>`;

export interface ChapterCallbacks {
  play(level: LevelDef): void;
  story(level: LevelDef): void;
  difficulty(d: Difficulty): void;
}

/** The level-select map: a button per level on its island, with its stars; locked levels wait their turn. */
export class ChapterScreen {
  readonly root = el('div', 'chapter');
  private readonly mapEl = el('div', 'chapter-map');
  private readonly card = el('div', 'level-card');
  private readonly top = el('header', 'chapter-top');
  /** The level just unlocked, which the map points at. */
  private fresh: string | null = null;

  constructor(
    host: HTMLElement,
    private readonly title: { number: number; name: string },
    private readonly chapter: LevelDef[],
    private readonly map: ChapterMapDef,
    private readonly progress: () => Progress,
    private readonly on: ChapterCallbacks,
  ) {
    this.root.hidden = true;
    const art = el('img', 'chapter-art');
    art.alt = '';
    art.src = assetUrl(map.art ?? map.sketch);
    art.addEventListener('error', () => art.remove());
    this.mapEl.append(art);
    this.root.append(this.mapEl, this.top, this.card);
    this.card.hidden = true;
    this.root.addEventListener('click', () => this.closeCard());
    host.append(this.root);
    window.addEventListener('resize', () => this.layout());
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  /** `fresh`: a level just unlocked, to point at. */
  show(fresh: string | null = null): void {
    this.fresh = fresh;
    this.root.hidden = false;
    this.closeCard();
    this.render();
    this.layout();
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** The map picture covers the screen (cropping its edges) and the buttons ride on it. */
  private layout(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const k = Math.max(w / this.map.w, h / this.map.h);
    this.mapEl.style.width = `${this.map.w * k}px`;
    this.mapEl.style.height = `${this.map.h * k}px`;
  }

  private render(): void {
    const p = this.progress();
    const open = unlockedCount(this.chapter, p);
    const total = chapterStars(this.chapter, p);
    this.top.replaceChildren();
    const done = this.chapter.every((l) => p.levels[l.id]);
    const heading = el('div', 'chapter-title', `<small>Chapter ${this.title.number}${done ? ' · <em class="complete">Complete!</em>' : ''}</small><b>${this.title.name}</b>`);
    const stars = el('div', 'chapter-stars', `<i class="star on"></i><b>${total}</b><span>/ ${this.chapter.length * 3}</span>`);
    const picker = el('div', 'diff');
    picker.setAttribute('role', 'radiogroup');
    picker.setAttribute('aria-label', 'Difficulty');
    for (const d of DIFFICULTIES) {
      const b = button(DIFFICULTY[d].name, `diff-${d}${p.difficulty === d ? ' on' : ''}`, () => {
        this.on.difficulty(d);
        this.render();
      });
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(p.difficulty === d));
      b.title = DIFFICULTY[d].blurb;
      picker.append(b);
    }
    this.top.append(heading, stars, picker);

    for (const n of this.mapEl.querySelectorAll('.node, .storm')) n.remove();
    this.chapter.forEach((level, i) => {
      const rec = p.levels[level.id];
      const locked = i >= open;
      const next = !locked && !rec;
      const node = el('button', `node${locked ? ' locked' : ''}${next ? ' next' : ''}${level.id === this.fresh ? ' fresh' : ''}`);
      node.type = 'button';
      node.dataset.level = level.id;
      node.style.left = `${(this.map.nodes[i][0] / this.map.w) * 100}%`;
      node.style.top = `${(this.map.nodes[i][1] / this.map.h) * 100}%`;
      node.setAttribute('aria-label', locked ? `Level ${i + 1}: locked` : `Level ${i + 1}: ${level.name}`);
      node.innerHTML = `<span class="flag">${locked ? LOCK : i + 1}</span>${locked ? '' : starRow(rec?.stars ?? 0)}${rec?.best === 'hard' ? '<em class="hard-badge" title="Won on Hard">H</em>' : ''}`;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        void sfx.unlock();
        sfx.play('click', 0.35, 0);
        if (locked) {
          node.classList.remove('shake');
          void node.offsetWidth;
          node.classList.add('shake');
          return;
        }
        this.openCard(i, node);
      });
      this.mapEl.append(node);
    });
    const storm = el('div', 'storm', `<b>Chapter ${this.title.number + 1}</b><span>Coming soon</span>`);
    storm.style.left = `${(this.map.storm[0] / this.map.w) * 100}%`;
    storm.style.top = `${(this.map.storm[1] / this.map.h) * 100}%`;
    this.mapEl.append(storm);
  }

  private openCard(i: number, node: HTMLElement): void {
    const level = this.chapter[i];
    const p = this.progress();
    const rec = p.levels[level.id];
    const story = p.seen.includes(`${level.id}:before`);
    this.card.replaceChildren();
    this.card.append(
      el('small', 'card-kicker', `Level ${i + 1} · ${level.waves.length} waves`),
      el('h2', '', level.name),
      el('p', 'card-blurb', level.blurb ?? ''),
      el('div', 'card-stars', starRow(rec?.stars ?? 0) + (rec ? `<span>Best: ${DIFFICULTY[rec.best].name}</span>` : '<span>Not won yet</span>')),
    );
    const row = el('div', 'card-buttons');
    if (story) row.append(button('Story', 'ghost', () => this.on.story(level)));
    const play = button(`Play · ${DIFFICULTY[p.difficulty].name}`, 'primary', () => this.on.play(level));
    play.id = 'play-level';
    row.append(play);
    this.card.append(row);
    this.card.hidden = false;
    this.card.addEventListener('click', (e) => e.stopPropagation());
    // Beside its island: on the side with more room.
    const r = node.getBoundingClientRect();
    this.card.classList.toggle('left', r.left + r.width / 2 > window.innerWidth / 2);
    for (const n of this.mapEl.querySelectorAll('.node')) n.classList.toggle('picked', n === node);
  }

  private closeCard(): void {
    this.card.hidden = true;
    for (const n of this.mapEl.querySelectorAll('.node')) n.classList.remove('picked');
  }
}

// ---------------------------------------------------------------- story dialog

/** Captain Stormbeard, unseen: a shadow in a hat with two glowing eyes. */
const STORMBEARD = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
<defs><radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#5a4a8a"/><stop offset="1" stop-color="#1b1530"/></radialGradient></defs>
<path d="M30 92 Q100 40 170 92 Q150 100 100 98 Q50 100 30 92Z" fill="#120d22"/>
<path d="M14 96 Q100 70 186 96 L180 108 Q100 90 20 108Z" fill="#120d22"/>
<path d="M52 104 Q100 92 148 104 Q156 150 140 178 Q120 236 100 238 Q80 236 60 178 Q44 150 52 104Z" fill="url(#g)"/>
<path d="M58 150 Q100 140 142 150 Q150 200 100 238 Q50 200 58 150Z" fill="#241c40"/>
<ellipse cx="80" cy="128" rx="9" ry="5" fill="#ffd34d"/><ellipse cx="120" cy="128" rx="9" ry="5" fill="#ffd34d"/>
<path d="M68 116 L92 124 M132 116 L108 124" stroke="#120d22" stroke-width="6" stroke-linecap="round"/>
</svg>`)}`;

/** Shows dialog lines one at a time, typed out; a tap finishes the line or moves on, Skip ends the scene. */
export class StoryPlayer {
  readonly root = el('div', 'story');
  private readonly portrait = el('img', 'portrait');
  private readonly name = el('b', 'speaker');
  private readonly text = el('p', 'line');
  private readonly box = el('div', 'dialog');
  private typing = 0;
  private full = '';
  private shown = 0;
  private advance: (() => void) | null = null;
  private skip: (() => void) | null = null;

  /** `standIn`: pictures for speakers whose portraits aren't drawn yet (made from their puppets). */
  constructor(host: HTMLElement, private readonly standIn: Partial<Record<Speaker, string>> = {}) {
    this.root.hidden = true;
    this.portrait.alt = '';
    const frame = el('div', 'portrait-frame');
    frame.append(this.portrait);
    const speech = el('div', 'speech');
    speech.append(this.name, this.text, el('span', 'more', '▼'));
    this.box.append(frame, speech);
    const skip = button('Skip ▸▸', 'skip', () => this.skip?.());
    skip.id = 'story-skip';
    this.root.append(this.box, skip);
    this.root.addEventListener('click', () => this.tap());
    host.append(this.root);
  }

  setStandIn(who: Speaker, url: string): void {
    this.standIn[who] = url;
  }

  get playing(): boolean {
    return !this.root.hidden;
  }

  /** Plays the lines; `onLine` runs as each one appears (e.g. to move the hero). */
  async play(lines: StoryLine[], onLine?: (line: StoryLine) => void): Promise<void> {
    if (!lines.length) return;
    this.root.hidden = false;
    this.root.classList.remove('out');
    let skipped = false;
    for (const line of lines) {
      if (skipped) break;
      onLine?.(line);
      this.show(line);
      await new Promise<void>((done) => {
        this.advance = done;
        this.skip = () => {
          skipped = true;
          done();
        };
      });
    }
    this.advance = this.skip = null;
    clearInterval(this.typing);
    this.root.classList.add('out');
    await new Promise((r) => setTimeout(r, 180));
    this.root.hidden = true;
  }

  private tap(): void {
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.text.textContent = this.full;
      clearInterval(this.typing);
      this.box.classList.add('done');
      return;
    }
    sfx.play('click', 0.2, 0.1);
    this.advance?.();
  }

  private show(line: StoryLine): void {
    const def = SPEAKERS[line.who];
    const narrator = line.who === 'narrator';
    this.box.className = `dialog side-${def.side}${narrator ? ' narrator' : ''}`;
    this.box.style.setProperty('--plate', def.colour);
    this.name.textContent = def.name;
    this.name.hidden = narrator;
    const src = this.portraitFor(line);
    this.portrait.hidden = !src;
    if (src) {
      this.portrait.onerror = () => {
        const alt = this.fallbackFor(line.who);
        if (alt && this.portrait.src !== alt) this.portrait.src = alt;
        else this.portrait.hidden = true;
      };
      this.portrait.src = src;
    }
    // Restart the pop-in for each new speaker.
    this.box.classList.remove('enter', 'done');
    void this.box.offsetWidth;
    this.box.classList.add('enter');
    this.full = line.text;
    this.shown = 0;
    this.text.textContent = '';
    clearInterval(this.typing);
    this.typing = window.setInterval(() => {
      this.shown = Math.min(this.full.length, this.shown + 2);
      this.text.textContent = this.full.slice(0, this.shown);
      if (this.shown >= this.full.length) {
        clearInterval(this.typing);
        this.box.classList.add('done');
      }
    }, 30);
  }

  private portraitFor(line: StoryLine): string | null {
    if (line.who === 'narrator') return null;
    if (line.who === 'stormbeard') return STORMBEARD;
    const def = SPEAKERS[line.who];
    const path = (line.mood && def.portraits[line.mood]) || Object.values(def.portraits)[0];
    if (!path || missing(path)) return this.fallbackFor(line.who);
    return assetUrl(path);
  }

  private fallbackFor(who: Speaker): string | null {
    const def = SPEAKERS[who];
    if (def.fallback && !missing(def.fallback)) return assetUrl(def.fallback);
    return this.standIn[who] ?? null;
  }
}

// ---------------------------------------------------------------- end of battle

export interface EndInfo {
  won: boolean;
  stars: number;
  saved: number;
  total: number;
  difficulty: Difficulty;
  /** Beat the old record (more stars or a harder difficulty). */
  best: boolean;
  /** A level after this one in the chapter. */
  hasNext: boolean;
  tip?: string;
}

export type EndAction = 'next' | 'again' | 'map';

/** The victory or defeat card: stars pop in one by one, then the way on. Resolves with the button pressed. */
export function showEnd(host: HTMLElement, info: EndInfo): Promise<EndAction> {
  host.replaceChildren();
  const card = el('div', `end-card ${info.won ? 'won' : 'lost'}`);
  card.append(el('div', 'ribbon', info.won ? 'Victory!' : 'Defeat'));
  const stars = el('div', 'end-stars');
  for (let i = 0; i < 3; i++) {
    const s = el('i', 'big-star');
    stars.append(s);
    if (info.won && i < info.stars) {
      setTimeout(() => {
        s.classList.add('on');
        sfx.play(i === 2 ? 'levelup' : 'coin', 0.45, 0);
      }, 450 + i * 380);
    }
  }
  card.append(stars);
  card.append(el('p', 'end-note', info.won
    ? `<i class="gem"></i> ${info.saved} of ${info.total} crystals saved`
    : 'The pirates got away with every crystal…'));
  const tags = el('p', 'end-tags', `<span class="diff-tag diff-${info.difficulty}">${DIFFICULTY[info.difficulty].name}</span>`);
  if (info.won && info.best) tags.insertAdjacentHTML('beforeend', '<span class="best-tag">New best!</span>');
  card.append(tags);
  if (info.tip) card.append(el('p', 'end-tip', info.tip));
  const row = el('div', 'end-buttons');
  host.hidden = false;
  return new Promise((resolve) => {
    const done = (a: EndAction) => {
      host.hidden = true;
      resolve(a);
    };
    row.append(button('Map', 'ghost', () => done('map')));
    const again = button(info.won ? 'Replay' : 'Try again', info.won ? 'ghost' : 'primary', () => done('again'));
    again.id = 'again';
    row.append(again);
    if (info.won) {
      const next = button(info.hasNext ? 'Next level ▸' : 'Continue ▸', 'primary', () => done('next'));
      next.id = 'end-next';
      row.append(next);
    }
    card.append(row);
    host.append(card);
  });
}

// ---------------------------------------------------------------- pause

export type PauseAction = 'resume' | 'restart' | 'map';

export function showPause(host: HTMLElement, levelName: string, difficulty: Difficulty): Promise<PauseAction> {
  host.replaceChildren();
  const card = el('div', 'pause-card');
  card.append(el('h2', '', 'Paused'), el('p', '', `${levelName} · ${DIFFICULTY[difficulty].name}`));
  host.hidden = false;
  return new Promise((resolve) => {
    const done = (a: PauseAction) => {
      host.hidden = true;
      resolve(a);
    };
    const resume = button('Resume', 'primary', () => done('resume'));
    resume.id = 'resume';
    card.append(resume, button('Restart level', 'ghost', () => done('restart')), button('Chapter map', 'ghost', () => done('map')));
    host.append(card);
    host.onclick = (e) => {
      if (e.target === host) done('resume');
    };
  });
}
