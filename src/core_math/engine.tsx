export interface IterationStep {
    iter: number;
    relativeResidualGC: number;
    relativeResidualGCP: number;
}

export interface ComponentError {
    variable: string;
    xRef: number;
    xGCP: number;
    absError: number;
    relError: number | null;
    pctError: number | null;
}

export interface SimulationResult {
    isValid: boolean;
    errorMessage?: string;
    errorType?: 'DIMENSION' | 'NON_SYMMETRIC' | 'NON_SPD';
    isZeroRHS?: boolean;
    xRef: number[];
    refResidualNorm: number;
    xGC: number[];
    xGCP: number[];
    iterGC: number;
    iterGCP: number;
    convergedGC: boolean;
    convergedGCP: boolean;
    finalResGC: number;
    finalResGCP: number;
    kappaA: number;
    kappaPrecond: number;
    eigenvaluesA: number[];
    eigenvaluesPrecond: number[];
    sylvesterMinors: number[];
    componentErrors: ComponentError[];
    history: IterationStep[];
}

export interface QATestCaseResult {
    id: string;
    name: string;
    inputDesc: string;
    expectedDesc: string;
    obtainedDesc: string;
    passed: boolean;
}

export const dot = (u: number[], v: number[]): number =>
    u.reduce((s, val, i) => s + val * v[i], 0);

export const norm2 = (v: number[]): number => Math.sqrt(dot(v, v));

export const matVec = (A: number[][], x: number[]): number[] =>
    A.map(row => dot(row, x));

export function determinant(M: number[][]): number {
    const n = M.length;
    if (n === 1) return M[0][0];
    if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
    let det = 0;
    for (let c = 0; c < n; c++) {
        const sub = M.slice(1).map(r => r.filter((_, idx) => idx !== c));
        det += (c % 2 === 0 ? 1 : -1) * M[0][c] * determinant(sub);
    }
    return det;
}

export function computeSylvesterMinors(A: number[][]): number[] {
    return A.map((_, k) => {
        const sub = A.slice(0, k + 1).map(r => r.slice(0, k + 1));
        return determinant(sub);
    });
}

export function checkDimensions(A: number[][], b: number[]): { ok: boolean; msg?: string } {
    const n = A.length;
    if (n < 4) return { ok: false, msg: `Dimensión inválida: A tiene n=${n}; se exige n ≥ 4.` };
    for (let i = 0; i < n; i++) {
        if (!A[i] || A[i].length !== n) return { ok: false, msg: `La fila ${i + 1} de A no mide ${n}.` };
    }
    if (!b || b.length !== n) return { ok: false, msg: `A es ${n}x${n} pero b mide ${b?.length ?? 0}.` };
    return { ok: true };
}

export function checkSymmetry(A: number[][]): { ok: boolean; msg?: string } {
    const n = A.length;
    let maxEntry = 0;
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            maxEntry = Math.max(maxEntry, Math.abs(A[i][j]));
    const tol = Math.max(1e-12, maxEntry * 1e-12);
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            if (Math.abs(A[i][j] - A[j][i]) > tol)
                return { ok: false, msg: `No simétrica: A[${i + 1},${j + 1}]=${A[i][j]} ≠ A[${j + 1},${i + 1}]=${A[j][i]}.` };
    return { ok: true };
}

export function choleskyDecomposition(A: number[][]): { L?: number[][]; isSPD: boolean; msg?: string } {
    const n = A.length;
    const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const maxDiag = Math.max(...A.map((r, i) => Math.abs(r[i])), 0);
    if (maxDiag === 0) return { isSPD: false, msg: 'Matriz nula.' };
    const relMin = maxDiag * 1e-15;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let s = 0;
            for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
            if (i === j) {
                const d = A[i][i] - s;
                if (d <= relMin) return { isSPD: false, msg: `No SPD: fallo en Cholesky fila ${i + 1} (pivote=${d.toExponential(4)}).` };
                L[i][j] = Math.sqrt(d);
            } else {
                L[i][j] = (A[i][j] - s) / L[j][j];
            }
        }
    }
    return { L, isSPD: true };
}

export function solveCholesky(L: number[][], b: number[]): number[] {
    const n = L.length;
    const y = Array(n).fill(0);
    const x = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        let s = 0;
        for (let k = 0; k < i; k++) s += L[i][k] * y[k];
        y[i] = (b[i] - s) / L[i][i];
    }
    for (let i = n - 1; i >= 0; i--) {
        let s = 0;
        for (let k = i + 1; k < n; k++) s += L[k][i] * x[k];
        x[i] = (y[i] - s) / L[i][i];
    }
    return x;
}

export function jacobiEigenvalues(A: number[][], maxSweeps = 120, tol = 1e-14): number[] {
    const n = A.length;
    const M = A.map(r => [...r]);
    for (let sweep = 0; sweep < maxSweeps; sweep++) {
        let maxOff = 0, p = 0, q = 1;
        for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++)
                if (Math.abs(M[i][j]) > maxOff) { maxOff = Math.abs(M[i][j]); p = i; q = j; }
        if (maxOff < tol) break;
        const app = M[p][p], aqq = M[q][q], apq = M[p][q];
        const theta = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(theta), s = Math.sin(theta);
        for (let i = 0; i < n; i++) {
            if (i !== p && i !== q) {
                const mip = M[i][p], miq = M[i][q];
                M[i][p] = M[p][i] = c * mip - s * miq;
                M[i][q] = M[q][i] = s * mip + c * miq;
            }
        }
        M[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        M[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        M[p][q] = M[q][p] = 0;
    }
    return M.map((row, i) => row[i]).sort((a, b) => a - b);
}

export function runConjugateGradient(
    A: number[][],
    b: number[],
    x0: number[],
    tol: number,
    maxIter: number,
    usePreconditioner: boolean
): { x: number[]; iterations: number; converged: boolean; finalRelRes: number; resHistory: number[] } {
    const n = A.length;
    const normB = norm2(b);
    if (normB < 1e-15) return { x: Array(n).fill(0), iterations: 0, converged: true, finalRelRes: 0, resHistory: [0] };

    let x = [...x0];
    let r = b.map((bi, i) => bi - dot(A[i], x));
    let trueRelRes = norm2(r) / normB;
    const resHistory = [trueRelRes];

    const precond = (res: number[]) => (usePreconditioner ? res.map((ri, i) => ri / A[i][i]) : [...res]);

    let k = 0;
    let p = Array(n).fill(0);
    let rzPrev = 1.0;

    while (trueRelRes >= tol && k < maxIter) {
        const z = precond(r);
        const rzCurr = dot(r, z);
        k = k + 1;

        if (k === 1) {
            p = [...z];
        } else {
            const beta = rzCurr / rzPrev;
            p = z.map((zi, i) => zi + beta * p[i]);
        }

        const Ap = matVec(A, p);
        const pAp = dot(p, Ap);
        if (Math.abs(pAp) < 1e-30) break;

        const alpha = rzCurr / pAp;
        x = x.map((xi, i) => xi + alpha * p[i]);
        r = r.map((ri, i) => ri - alpha * Ap[i]);
        rzPrev = rzCurr;

        const Ax = matVec(A, x);
        const trueRes = b.map((bi, i) => bi - Ax[i]);
        trueRelRes = norm2(trueRes) / normB;
        resHistory.push(trueRelRes);
    }

    return { x, iterations: k, converged: trueRelRes < tol, finalRelRes: trueRelRes, resHistory };
}

export function executeFinancialSimulation(
    A: number[][],
    b: number[],
    x0?: number[],
    tol = 1e-6,
    maxIter = 50
): SimulationResult {
    const empty = (err: SimulationResult['errorType'], msg: string): SimulationResult => ({
        isValid: false, errorMessage: msg, errorType: err,
        xRef: [], refResidualNorm: 0, xGC: [], xGCP: [], iterGC: 0, iterGCP: 0,
        convergedGC: false, convergedGCP: false, finalResGC: 0, finalResGCP: 0,
        kappaA: 0, kappaPrecond: 0, eigenvaluesA: [], eigenvaluesPrecond: [],
        sylvesterMinors: [], componentErrors: [], history: []
    });

    const dim = checkDimensions(A, b);
    if (!dim.ok) return empty('DIMENSION', dim.msg!);

    const n = A.length;
    const initX = x0 && x0.length === n ? [...x0] : Array(n).fill(0);

    const sym = checkSymmetry(A);
    if (!sym.ok) return empty('NON_SYMMETRIC', sym.msg!);

    const chol = choleskyDecomposition(A);
    if (!chol.isSPD || !chol.L) return { ...empty('NON_SPD', chol.msg!), sylvesterMinors: computeSylvesterMinors(A) };

    const xRef = solveCholesky(chol.L, b);
    const refResidualNorm = norm2(matVec(A, xRef).map((v, i) => v - b[i]));
    const isZeroRHS = norm2(b) < 1e-15;

    const gcRes = runConjugateGradient(A, b, initX, tol, maxIter, false);
    const gcpRes = runConjugateGradient(A, b, initX, tol, maxIter, true);

    const eigA = jacobiEigenvalues(A);
    const kappaA = eigA[eigA.length - 1] / eigA[0];

    const Ahat = A.map((row, i) => row.map((v, j) => v / Math.sqrt(A[i][i] * A[j][j])));
    const eigP = jacobiEigenvalues(Ahat);
    const kappaPrecond = eigP[eigP.length - 1] / eigP[0];

    const componentErrors: ComponentError[] = xRef.map((ref, i) => {
        const gcp = gcpRes.x[i];
        const abs = Math.abs(ref - gcp);
        const isZero = Math.abs(ref) < 1e-15;
        const rel = isZero ? null : abs / Math.abs(ref);
        return {
            variable: `x_${i + 1}`,
            xRef: ref, xGCP: gcp,
            absError: abs,
            relError: rel,
            pctError: rel !== null ? rel * 100 : null
        };
    });

    const maxSteps = Math.max(gcRes.resHistory.length, gcpRes.resHistory.length);
    const history: IterationStep[] = [];
    for (let s = 0; s < maxSteps; s++) {
        history.push({
            iter: s,
            relativeResidualGC: Math.max(1e-16, gcRes.resHistory[Math.min(s, gcRes.resHistory.length - 1)]),
            relativeResidualGCP: Math.max(1e-16, gcpRes.resHistory[Math.min(s, gcpRes.resHistory.length - 1)])
        });
    }

    return {
        isValid: true, isZeroRHS,
        xRef, refResidualNorm,
        xGC: gcRes.x, xGCP: gcpRes.x,
        iterGC: gcRes.iterations, iterGCP: gcpRes.iterations,
        convergedGC: gcRes.converged, convergedGCP: gcpRes.converged,
        finalResGC: gcRes.finalRelRes, finalResGCP: gcpRes.finalRelRes,
        kappaA, kappaPrecond,
        eigenvaluesA: eigA, eigenvaluesPrecond: eigP,
        sylvesterMinors: computeSylvesterMinors(A),
        componentErrors, history
    };
}