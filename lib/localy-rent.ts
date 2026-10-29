
/**
 * Les dates de facturation sont manipulées en UTC pour éviter
 * les décalages de jour liés au fuseau horaire du serveur.
 *
 * Les montants sont exprimés en centimes :
 * 750,00 € = 75000.
 */

export function debutDuMois(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function finDuMois(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  );
}

export function clePeriode(date: Date): string {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

export function dateExigibilite(
  annee: number,
  mois: number,
  jour: number
): Date {
  const dernierJour = new Date(
    Date.UTC(annee, mois + 1, 0)
  ).getUTCDate();

  return new Date(
    Date.UTC(annee, mois, Math.min(Math.max(jour, 1), dernierJour))
  );
}

/**
 * Calcule le loyer du mois au prorata des jours d'occupation.
 * Le premier et le dernier jour d'occupation sont inclus.
 */
export function calculerLoyerProrata(
  loyerMensuel: number,
  debutBail: Date,
  finBail: Date | null,
  periode: Date
): number {
  const debutMois = debutDuMois(periode);
  const finMois = finDuMois(periode);

  const debutOccupation = new Date(
    Math.max(debutMois.getTime(), debutDuJour(debutBail).getTime())
  );

  const finOccupation = finBail
    ? new Date(Math.min(finMois.getTime(), debutDuJour(finBail).getTime()))
    : finMois;

  if (debutOccupation > finOccupation) {
    return 0;
  }

  const joursOccupes =
    (finOccupation.getTime() - debutOccupation.getTime()) /
      86_400_000 +
    1;

  const joursDuMois = finMois.getUTCDate();

  return Math.round((loyerMensuel * joursOccupes) / joursDuMois);
}

function debutDuJour(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}
