import { formatNumber } from '../core/format';
import { storyMemberId, type StoryQuest } from '../core/story';
import { tk } from '../i18n';

/** Texto do objetivo de uma missão da Jornada do Rei. */
export const storyText = (quest: StoryQuest): string =>
  tk(`story.${quest.kind}`, {
    n: formatNumber(quest.target),
    name: quest.member !== undefined ? tk(`member.${storyMemberId(quest)}`) : '',
  });

export const chapterTitle = (chapter: number): string =>
  tk('story.chapter', { n: chapter, name: tk(`chapter.${chapter}`) });
