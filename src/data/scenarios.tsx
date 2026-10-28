import { executeFinancialSimulation, QATestCaseResult } from '../core_math/engine';

export interface ScenarioData {
    id: 'ideal' | 'stress' | 'ill_conditioned';
    name: string;
    subtitle: string;
    A: number[][];
    b: number[];
    financialInterpretation: string;
}

export const SCENARIOS: Record<string, ScenarioData> = {
    ideal: {
        id: 'ideal',
        name: '1. Escenario Ideal',
        subtitle: 'Operación estable y balanceada (det A₁ = 4400)',
        A: [[10, 2, 1, 0], [2, 9, 2, 1], [1, 2, 8, 1], [0, 1, 1, 7]],
        b: [150, 120, 100, 80],
        financialInterpretation:
            'Asignación equilibrada: 12.6659 kBs en compras y entre 7.7568 y 9.2023 kBs en logística, conservación y embalaje.'
    },
    stress: {
        id: 'stress',
        name: '2. Bajo Estrés Financiero',
        subtitle: 'Shock inflacionario y logístico (det A₂ = 13703)',
        A: [[14, 4, 2, 1], [4, 13, 4, 2], [2, 4, 11, 2], [1, 2, 2, 9]],
        b: [210, 160, 95, 70],
        financialInterpretation:
            'El shock inflacionario concentra fondos en compras (12.2761 kBs) y fletes (6.9255 kBs), comprimiendo mantenimiento (3.1260 kBs).'
    },
    ill_conditioned: {
        id: 'ill_conditioned',
        name: '3. Mal Condicionado',
        subtitle: 'Desbalance severo de escala (det A₃ = 31 835 972.25)',
        A: [[20000, 10, 5, 1], [10, 400, 2, 0.5], [5, 2, 8, 0.1], [1, 0.5, 0.1, 0.5]],
        b: [100000, 4000, 160, 15],
        financialInterpretation:
            'Pese a la asimetría extrema en compras (b₁ = 100 000), el GCP estabiliza las partidas menores (x₁≈4.9912, x₂≈9.7943, x₃≈14.3400, x₄≈7.3554 kBs) en 3 iteraciones.'
    }
};

export function runAutomatedQASuite(): QATestCaseResult[] {
    const s1 = executeFinancialSimulation(SCENARIOS.ideal.A, SCENARIOS.ideal.b);
    const s2 = executeFinancialSimulation(SCENARIOS.stress.A, SCENARIOS.stress.b);
    const s3 = executeFinancialSimulation(SCENARIOS.ill_conditioned.A, SCENARIOS.ill_conditioned.b);

    const maxRefRes = Math.max(s1.refResidualNorm, s2.refResidualNorm, s3.refResidualNorm);
    const qa1Pass = s1.isValid && s2.isValid && s3.isValid && maxRefRes < 1e-10 && s3.convergedGCP;

    const nonSymA = SCENARIOS.ideal.A.map(r => [...r]); nonSymA[0][1] = 99;
    const resNonSym = executeFinancialSimulation(nonSymA, SCENARIOS.ideal.b);
    const qa2Pass = !resNonSym.isValid && resNonSym.errorType === 'NON_SYMMETRIC';

    const nonSpdA = SCENARIOS.ideal.A.map(r => [...r]); nonSpdA[0][0] = -5;
    const resNonSpd = executeFinancialSimulation(nonSpdA, SCENARIOS.ideal.b);
    const qa3Pass = !resNonSpd.isValid && resNonSpd.errorType === 'NON_SPD';

    const modB = [300, 120, 100, 80];
    const expected = [28.45, 4.45, 6.60, 9.85];
    const resMod = executeFinancialSimulation(SCENARIOS.ideal.A, modB);
    const qa4Pass =
        resMod.isValid &&
        resMod.refResidualNorm < 1e-10 &&
        Math.max(...resMod.xRef.map((v, i) => Math.abs(v - expected[i]))) < 1e-9;

    const qa5Pass =
        s3.kappaPrecond < s3.kappaA &&
        s3.iterGCP <= s3.iterGC &&
        s3.convergedGCP;

    const diagA = [[10, 0, 0, 0], [0, 10, 0, 0], [0, 0, 10, 0], [0, 0, 0, 10]];
    const resZero = executeFinancialSimulation(diagA, [20, 0, 30, 40]);
    const qa6Pass =
        resZero.isValid &&
        resZero.componentErrors[1].relError === null &&
        resZero.componentErrors[1].pctError === null;

    const badDim = executeFinancialSimulation(SCENARIOS.ideal.A, [150, 120, 100]);
    const qa7Pass = !badDim.isValid && badDim.errorType === 'DIMENSION';

    return [
        {
            id: 'QA-01', name: 'Carga y residual de referencia', inputDesc: 'Escenarios 1, 2 y 3.',
            expectedDesc: 'Válidos, convergen, ||Ax_ref - b||₂ < 1e-10.',
            obtainedDesc: `Máx ||Ax_ref-b||₂ = ${maxRefRes.toExponential(2)}. Residuo GCP Esc.3 = ${s3.finalResGCP.toExponential(2)}.`,
            passed: qa1Pass
        },
        {
            id: 'QA-02', name: 'Matriz no simétrica', inputDesc: 'A₁ con a₁₂=99 ≠ a₂₁=2.',
            expectedDesc: 'Error NON_SYMMETRIC controlado.', obtainedDesc: resNonSym.errorMessage || 'Sin mensaje', passed: qa2Pass
        },
        {
            id: 'QA-03', name: 'Matriz simétrica no SPD', inputDesc: 'A₁ con a₁₁=-5.',
            expectedDesc: 'Error NON_SPD en Cholesky.', obtainedDesc: resNonSpd.errorMessage || 'Sin mensaje', passed: qa3Pass
        },
        {
            id: 'QA-04', name: 'Edición dinámica', inputDesc: 'b₁: 150 → 300 en Escenario 1.',
            expectedDesc: 'x_ref = [28.45, 4.45, 6.60, 9.85]ᵀ.',
            obtainedDesc: `x_ref = [${resMod.xRef.map(v => v.toFixed(4)).join(', ')}]ᵀ.`, passed: qa4Pass
        },
        {
            id: 'QA-05', name: 'Contraste de precondicionamiento', inputDesc: 'Escenario 3.',
            expectedDesc: 'κ(M⁻¹A) << κ(A) e Iter_GCP ≤ Iter_GC.',
            obtainedDesc: `κ(M⁻¹A)=${s3.kappaPrecond.toFixed(4)} vs κ(A)=${s3.kappaA.toFixed(2)}; GCP=${s3.iterGCP}, GC=${s3.iterGC}.`,
            passed: qa5Pass
        },
        {
            id: 'QA-06', name: 'División por cero', inputDesc: 'Sistema diagonal con b=[20,0,30,40]ᵀ.',
            expectedDesc: 'E_r,2 = "No definido".', obtainedDesc: `relError=${String(resZero.componentErrors[1].relError)}.`, passed: qa6Pass
        },
        {
            id: 'QA-07', name: 'Incompatibilidad dimensional', inputDesc: 'A 4×4 con b de longitud 3.',
            expectedDesc: 'Error DIMENSION controlado.', obtainedDesc: badDim.errorMessage || 'Sin mensaje', passed: qa7Pass
        }
    ];
}