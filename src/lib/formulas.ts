export type FormulaOutput = {
  metric1: string;
  metric2: string;
  metric3: string;
  metric4: string;
};

const formatMillions = (value: number, digits = 1) =>
  `$${(value / 1000000).toFixed(digits)}M`;

const formatThousands = (value: number) => `$${Math.round(value / 1000)}K`;

export function calculateSandboxOutputs(
  formulaId:
    | "infinity_belize"
    | "valet_vault_saas"
    | "conyers_sports_academy"
    | "healthquest_campaign"
    | "inspired_campaign"
    | "o2_development",
  var1: number,
  var2: number,
  var3: number
): FormulaOutput {
  if (formulaId === "infinity_belize") {
    const scaleFactor = var1 / 100;
    const keys5Star = Math.round(1660 * scaleFactor);
    const keys4Star = Math.round(2260 * scaleFactor);
    const keys3Star = Math.round(940 * scaleFactor);
    const totalKeys = keys5Star + keys4Star + keys3Star;
    const adr5Star = 600 * var2;
    const adr4Star = 415 * var2;
    const adr3Star = 300 * var2;
    const dailyRev =
      keys5Star * adr5Star * (var3 / 100) +
      keys4Star * adr4Star * (var3 / 100) +
      keys3Star * adr3Star * (var3 / 100);
    const annualRev = dailyRev * 365;
    const economicImpact = annualRev / 0.174;
    const corporateTax = annualRev * 0.12 * 0.533;

    return {
      metric1: formatMillions(annualRev, 1),
      metric2: formatMillions(economicImpact, 1),
      metric3: formatMillions(corporateTax, 1),
      metric4: `${totalKeys.toLocaleString()} modeled keys`
    };
  }

  if (formulaId === "valet_vault_saas") {
    const monthlyUnits = var1;
    const unitPrice = var2;
    const monthlySaas = var3;
    const annualHardwareRevenue = monthlyUnits * 12 * unitPrice;
    const yearOneSaasRunRate = monthlyUnits * 6 * monthlySaas * 12;
    const annualGrossRevenue = annualHardwareRevenue + yearOneSaasRunRate;
    const estimatedEbitda = annualGrossRevenue * 0.45;
    const yearThreeArr = monthlyUnits * 36 * monthlySaas * 12;

    return {
      metric1: formatThousands(annualHardwareRevenue),
      metric2: formatThousands(annualGrossRevenue),
      metric3: formatThousands(estimatedEbitda),
      metric4: formatMillions(yearThreeArr, 2)
    };
  }

  if (formulaId === "healthquest_campaign") {
    const engagedCohorts = var1;
    const actionsPerCohort = var2;
    const mediaMultiplier = var3 / 100;
    const baseActions = engagedCohorts * actionsPerCohort;
    const amplifiedReach = Math.round(baseActions * (1 + mediaMultiplier * 3.2));
    const executionCapacity = Math.round(amplifiedReach * 0.42);
    const eventScale = Math.max(1, Math.round(engagedCohorts / 8));

    return {
      metric1: `${Math.round(baseActions / 1000)}K`,
      metric2: `${Math.round(amplifiedReach / 1000)}K`,
      metric3: `${Math.round(executionCapacity / 1000)}K`,
      metric4: `${eventScale} activations`
    };
  }

  if (formulaId === "inspired_campaign") {
    const outreachCells = var1;
    const responsePerCell = var2;
    const engagementMultiplier = var3 / 100;
    const baseResponses = outreachCells * responsePerCell;
    const amplifiedReach = Math.round(baseResponses * (1 + engagementMultiplier * 4.6));
    const enrollmentProxy = Math.round(baseResponses * (0.18 + engagementMultiplier * 0.22));
    const activationLayers = Math.max(1, Math.round(outreachCells / 9));

    return {
      metric1: `${Math.round(baseResponses / 1000)}K`,
      metric2: `${Math.round(amplifiedReach / 1000)}K`,
      metric3: `${Math.round(enrollmentProxy / 1000)}K`,
      metric4: `${activationLayers} layers`
    };
  }

  if (formulaId === "o2_development") {
    const scale = var1 / 100;
    const strength = var2;
    const stabilization = var3 / 100;
    const revenueProxy = 42000000 * scale * strength;
    const impactProxy = revenueProxy * 2.1;
    const noiProxy = revenueProxy * 0.34 * stabilization;
    const supportablePhases = Math.max(1, Math.round(scale * stabilization * 4));

    return {
      metric1: formatMillions(revenueProxy, 1),
      metric2: formatMillions(impactProxy, 1),
      metric3: formatMillions(noiProxy, 1),
      metric4: `${supportablePhases} phases`
    };
  }

  const ptRevenue = var1 * var2 * 12;
  const tournamentRevenue = var3 * 37500;
  const totalRevenue = ptRevenue + tournamentRevenue + 1921600;
  const ebitda = totalRevenue - (500000 + totalRevenue * 0.15);
  const dscr = ebitda / 1136665;

  return {
    metric1: formatMillions(ptRevenue, 2),
    metric2: formatMillions(totalRevenue, 2),
    metric3: formatMillions(ebitda, 2),
    metric4: `${dscr.toFixed(2)}x DSCR`
  };
}
