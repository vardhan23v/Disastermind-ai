// Scripted social-media corpus. Every post is deterministic; the engine
// publishes them at fixed ticks so the demo narrative stays coherent.

import type { CityPoint, SocialPost, SosKind, ZoneId } from '@/types';

export interface CorpusPost {
  platform: 'twitter' | 'whatsapp' | 'news';
  author: string;
  content: string;
  zone: ZoneId;
  category: SosKind;
  credibility: number;
  createdAtTick: number;
  pos: CityPoint;
}

export const SOCIAL_CORPUS: SocialPost[] = [
  {
    id: 'sp1',
    platform: 'twitter',
    author: '@krishna_chennai',
    content: 'Water entering ground floor near Market Road, Zone A. Please help! #flood',
    zone: 'A',
    category: 'trapped',
    credibility: 88,
    verified: true,
    createdAtTick: 13,
    pos: { x: 5200, y: 9400 },
  },
  {
    id: 'sp2',
    platform: 'whatsapp',
    author: 'Saroja (neighbourhood group)',
    content: 'Bridge on NH-7 looks cracked — local traffic diverted.',
    zone: 'C',
    category: 'infrastructure',
    credibility: 71,
    verified: false,
    createdAtTick: 20,
    pos: { x: 6200, y: 5600 },
  },
  {
    id: 'sp3',
    platform: 'twitter',
    author: '@oldtown_food',
    content: 'We lost power + no water in Block B4. 8 families need relief',
    zone: 'B',
    category: 'food',
    credibility: 81,
    verified: true,
    createdAtTick: 22,
    pos: { x: 3600, y: 7000 },
  },
  {
    id: 'sp4',
    platform: 'whatsapp',
    author: 'Fire dept. volunteer',
    content: 'Container truck overturned near Ring Road interchange. Drivers stuck.',
    zone: 'C',
    category: 'trapped',
    credibility: 90,
    verified: true,
    createdAtTick: 26,
    pos: { x: 6100, y: 6600 },
  },
  {
    id: 'sp5',
    platform: 'news',
    author: 'CityBeat 24',
    content: 'Heavy rain advisory: Port City braces for 110 mm/hr as cyclone approaches.',
    zone: 'A',
    category: 'infrastructure',
    credibility: 95,
    verified: true,
    createdAtTick: 6,
    pos: { x: 4800, y: 10000 },
  },
  {
    id: 'sp6',
    platform: 'whatsapp',
    author: 'Apartment watch',
    content: 'Water up to first floor on Sailors Colony, west side. 5 of us on terrace.',
    zone: 'A',
    category: 'trapped',
    credibility: 77,
    verified: false,
    createdAtTick: 15,
    pos: { x: 6800, y: 10200 },
  },
  {
    id: 'sp7',
    platform: 'twitter',
    author: '@med_lab_out',
    content: 'Clinic flooded, vital medicines getting wet. Any truck headed to shelter?',
    zone: 'B',
    category: 'medical',
    credibility: 66,
    verified: false,
    createdAtTick: 24,
    pos: { x: 2800, y: 8200 },
  },
  {
    id: 'sp8',
    platform: 'whatsapp',
    author: 'Neighbourhood net',
    content: 'Fire at transformer yard, Airport Spur. Small for now.',
    zone: 'F',
    category: 'fire',
    credibility: 59,
    verified: false,
    createdAtTick: 31,
    pos: { x: 8000, y: 9300 },
  },
];

export interface SosTemplate {
  kind: SosKind;
  description: string;
  peopleCount: number;
  zone: ZoneId;
  createdAt: number;
  pos: CityPoint;
  text: string;
}

export const SOS_PATROL: SosTemplate[] = [
  {
    kind: 'trapped',
    description: 'Family of 4 on rooftop, water rising fast',
    peopleCount: 4,
    zone: 'A',
    createdAt: 13,
    pos: { x: 5250, y: 9500 },
    text: 'Caller in distress: rooftop, water rising.',
  },
  {
    kind: 'medical',
    description: 'Elderly woman needs dialysis, ambulance needed',
    peopleCount: 1,
    zone: 'A',
    createdAt: 16,
    pos: { x: 6900, y: 9800 },
    text: 'Medical SOS — dialysis patient.',
  },
  {
    kind: 'food',
    description: '3 families stranded, no food or water for 6 hours',
    peopleCount: 12,
    zone: 'B',
    createdAt: 18,
    pos: { x: 3300, y: 7500 },
    text: 'Food / water — 12 people stranded.',
  },
  {
    kind: 'trapped',
    description: 'Six people trapped in basement of electronics store',
    peopleCount: 6,
    zone: 'C',
    createdAt: 21,
    pos: { x: 5900, y: 5400 },
    text: 'Basement flooding, 6 trapped.',
  },
  {
    kind: 'medical',
    description: 'Woman in labor — transport urgently needed',
    peopleCount: 2,
    zone: 'A',
    createdAt: 25,
    pos: { x: 6000, y: 10100 },
    text: 'Childbirth emergency.',
  },
  {
    kind: 'food',
    description: 'Relief centre needs water replenishment',
    peopleCount: 40,
    zone: 'B',
    createdAt: 28,
    pos: { x: 4300, y: 8400 },
    text: 'Water resupply request.',
  },
  {
    kind: 'trapped',
    description: 'Bus stopped, 34 passengers on NH-7',
    peopleCount: 34,
    zone: 'C',
    createdAt: 30,
    pos: { x: 7000, y: 5200 },
    text: 'Bus stranded — 34 aboard.',
  },
  {
    kind: 'infrastructure',
    description: 'Power line down on Anjalee St — sparks in water',
    peopleCount: 0,
    zone: 'D',
    createdAt: 33,
    pos: { x: 2400, y: 4600 },
    text: 'Live line in floodwater.',
  },
];