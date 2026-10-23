import type { Alert } from '../../store/useStore';

export interface RouteProposal {
  title: string;
  distance: string;
  estTime: string;
  safetyGear: string[];
  steps: string[];
  /** Distances / temps = procédure opérationnelle de site, pas de télémétrie live. */
  isOperationalProcedure: true;
  sourceZone: string;
}

const KNOWN_ZONES = ['ZONE A', 'ZONE B', 'ZONE C', 'ZONE D', 'ZONE E', 'ZONE F'] as const;

export function isKnownMineZone(zone: string | undefined | null): boolean {
  if (!zone) return false;
  const z = zone.toUpperCase().trim();
  return KNOWN_ZONES.some((k) => z === k || z.includes(k) || z === k.replace('ZONE ', ''));
}

/** Alerte SOS / chute non résolue provenant de la montre (watch API). */
export function isWatchUrgencyAlert(alert: Alert | null | undefined): boolean {
  if (!alert || alert.resolved) return false;
  return alert.type === 'emergency' || alert.type === 'fall';
}

export function findWatchUrgencyAlert(
  alerts: Alert[],
  minerId: string | undefined | null,
): Alert | null {
  if (!minerId) return null;
  return alerts.find((a) => a.minerId === minerId && isWatchUrgencyAlert(a)) || null;
}

/**
 * Itinéraire d'accès / évacuation depuis le Centre de Contrôle vers la zone du creuseur.
 * Basé uniquement sur la dernière zone connue (montre / alerte) — distances et temps
 * sont des procédures opérationnelles de site, pas une télémétrie live.
 * Retourne null si la zone est inconnue.
 */
export function getRouteToMiner(zone: string, gallery: string): RouteProposal | null {
  if (!isKnownMineZone(zone)) return null;

  const upperZone = (zone || '').toUpperCase();
  const galleryLabel = gallery?.trim() || null;

  if (upperZone.includes('ZONE A') || upperZone === 'A') {
    return {
      title: "Procédure d'accès : Mine à Ciel Ouvert (Zone A)",
      distance: '1 200 m (procédure site)',
      estTime: '6 min (procédure site)',
      isOperationalProcedure: true,
      sourceZone: 'ZONE A',
      safetyGear: [
        'Gilet de sécurité haute visibilité',
        'Casque de protection avec visière',
        'Chaussures de sécurité renforcées',
      ],
      steps: [
        "Quitter le Centre de Contrôle de surface et s'équiper des EPI réglementaires de surface.",
        "Prendre le véhicule utilitaire tout-terrain (4x4 d'intervention).",
        "Emprunter la piste d'accès principale Nord pour descendre dans la fosse.",
        `Suivre le balisage de sécurité en contournant la zone d'excavation active.`,
        galleryLabel
          ? `Rejoindre à pied la section ${galleryLabel} pour localiser le mineur.`
          : 'Rejoindre à pied le dernier point connu transmis par la montre.',
      ],
    };
  }
  if (upperZone.includes('ZONE B') || upperZone === 'B') {
    return {
      title: "Procédure d'accès : Rampes de Transport (Zone B)",
      distance: '1 500 m (procédure site)',
      estTime: '8 min (procédure site)',
      isOperationalProcedure: true,
      sourceZone: 'ZONE B',
      safetyGear: [
        'Gilet de sécurité classe 3',
        "Bouchons d'oreilles homologués",
        'Lunettes de protection',
      ],
      steps: [
        "Quitter le bâtiment technique et s'équiper du matériel de protection acoustique.",
        'Suivre la route de service parallèle au convoyeur à bande principal.',
        'Entrer dans la zone des rampes par le sas piéton sécurisé.',
        `Rester vigilant vis-à-vis des tombereaux lourds CAT en phase de descente/remontée.`,
        galleryLabel
          ? `Entrer dans le secteur de rampe ou galerie (${galleryLabel}) pour intercepter le mineur.`
          : 'Progresser vers le dernier point connu transmis par la montre.',
      ],
    };
  }
  if (upperZone.includes('ZONE C') || upperZone === 'C') {
    return {
      title: "Procédure d'accès : Raffinerie & Traitement (Zone C)",
      distance: '600 m (procédure site)',
      estTime: '4 min (procédure site)',
      isOperationalProcedure: true,
      sourceZone: 'ZONE C',
      safetyGear: [
        'Masque de protection FFP3 anti-poussière',
        'Lunettes de protection étanches',
        'Casque avec jugulaire',
      ],
      steps: [
        'Passer par le sas de décontamination de la Raffinerie Est et enfiler le masque respiratoire.',
        'Prendre la passerelle métallique surélevée surplombant le broyeur primaire.',
        'Descendre les escaliers techniques menant aux cellules de flottation.',
        `Traverser la galerie technique de distribution hydraulique.`,
        galleryLabel
          ? `Entrer dans le secteur d'usine spécifié (${galleryLabel}).`
          : 'Progresser vers le dernier point connu transmis par la montre.',
      ],
    };
  }
  if (upperZone.includes('ZONE D') || upperZone === 'D') {
    return {
      title: "Procédure d'accès : Niveau -100m (Stockage - Zone D)",
      distance: '800 m dont 100 m verticaux (procédure site)',
      estTime: '11 min (procédure site)',
      isOperationalProcedure: true,
      sourceZone: 'ZONE D',
      safetyGear: [
        'Auto-sauveteur autonome (type oxygène chimique)',
        'Lampe frontale de mineur chargée',
        'Détecteur multi-gaz portable (CO/O2/H2S)',
      ],
      steps: [
        "Se diriger vers le Puits d'Accès Principal et embarquer dans la cage d'ascenseur n°1.",
        'Demander le palier Niveau -100m au pupitre de commande.',
        "À la sortie de la cage, vérifier l'affichage fixe des conditions de gaz.",
        'Progresser dans la galerie principale de liaison Est sous ventilation forcée.',
        galleryLabel
          ? `Tourner à gauche après la porte coupe-feu vers la galerie de stockage (${galleryLabel}).`
          : 'Progresser vers le dernier point connu transmis par la montre.',
      ],
    };
  }
  if (upperZone.includes('ZONE E') || upperZone === 'E') {
    return {
      title: "Procédure d'accès : Niveau -200m (Atelier - Zone E)",
      distance: '1 100 m dont 200 m verticaux (procédure site)',
      estTime: '14 min (procédure site)',
      isOperationalProcedure: true,
      sourceZone: 'ZONE E',
      safetyGear: [
        'Auto-sauveteur de ceinture',
        'Lampe de casque ATEX',
        'Détecteur multigaz CO/CH4',
        'Gants de protection mécanique',
      ],
      steps: [
        'Accéder au puits de service n°2 (cage principale lourde).',
        "Effectuer la descente jusqu'au Niveau -200m.",
        "Quitter la recette du puits et s'engager dans la galerie de transport de matériel.",
        'Emprunter le by-pass piéton balisé en vert pour éviter les chargeuses souterraines (LHD).',
        galleryLabel
          ? `Pénétrer dans le hall d'entretien ou la galerie secondaire (${galleryLabel}).`
          : 'Progresser vers le dernier point connu transmis par la montre.',
      ],
    };
  }
  if (upperZone.includes('ZONE F') || upperZone === 'F') {
    return {
      title: "Procédure d'accès : Niveau -300m (Front de taille - Zone F)",
      distance: '1 400 m dont 300 m verticaux (procédure site)',
      estTime: '18 min (procédure site)',
      isOperationalProcedure: true,
      sourceZone: 'ZONE F',
      safetyGear: [
        'Auto-sauveteur de secours autonome (obligatoire)',
        'Lampe de sécurité frontale ATEX',
        'Explosimètre individuel réglé',
        'Vêtements de protection antistatiques',
      ],
      steps: [
        "Se présenter au puits d'accès rapide n°1 (descente rapide autorisée).",
        "Descendre au Niveau -300m (fond de mine sous haute pression d'aération).",
        'Suivre le boyau principal Ouest en restant près de la ligne de guidage.',
        'Traverser le sas de ventilation n°4 (équilibrage de pression).',
        galleryLabel
          ? `Avancer avec prudence jusqu'au front de taille (${galleryLabel}).`
          : 'Progresser vers le dernier point connu transmis par la montre.',
      ],
    };
  }

  return null;
}

export function getZoneDepthLabel(zone: string): string {
  if (!isKnownMineZone(zone)) return 'Zone inconnue';
  const z = (zone || '').toUpperCase();
  if (z.includes('D')) return '-100 m';
  if (z.includes('E')) return '-200 m';
  if (z.includes('F')) return '-300 m';
  return 'Surface';
}

/** Distance approximative (unités carte) sur la trajectoire réelle du store. */
export function computeTrajectoryDistance(
  trajectory: { x: number; y: number }[] | undefined,
): number {
  if (!trajectory || trajectory.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < trajectory.length; i++) {
    const dx = trajectory[i].x - trajectory[i - 1].x;
    const dy = trajectory[i].y - trajectory[i - 1].y;
    dist += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.round(dist);
}
