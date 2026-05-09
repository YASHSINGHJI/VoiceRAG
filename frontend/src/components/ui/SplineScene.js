/**
 * SplineScene — from AI Component 3.txt (splite.tsx)
 * Adapted: TypeScript → JS, lazy-loaded @splinetool/react-spline
 */
import { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

export function SplineScene({ scene, className = '', style = {} }) {
  return (
    <Suspense
      fallback={
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(0,255,200,0.5)', fontSize: '2rem',
        }}>
          <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
        </div>
      }
    >
      <Spline scene={scene} className={className} style={style} />
    </Suspense>
  );
}

export default SplineScene;
