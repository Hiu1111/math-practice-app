import { ButtonLink } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';

const SYMBOLS = [
  { op: 'addition', symbol: '+' },
  { op: 'subtraction', symbol: '−' },
  { op: 'multiplication', symbol: '×' },
  { op: 'division', symbol: '÷' },
];

export function HomePage() {
  return (
    <PageContainer width="narrow" documentTitle="Home">
      <section className="hero card" aria-labelledby="home-title">
        <div className="hero__symbols" aria-hidden="true">
          {SYMBOLS.map(({ op, symbol }) => (
            <span key={op} className={`sym sym--${op}`}>
              {symbol}
            </span>
          ))}
        </div>
        <h1 id="home-title" className="hero__title">
          Let&apos;s Practice Math!
        </h1>
        <p className="hero__text">
          Pick the kind of math you want to practice, flip the cards, and watch yourself get better
          every day.
        </p>
        <div className="hero__actions">
          <ButtonLink to="/practice/setup" size="lg" block>
            <span aria-hidden="true">▶</span> Start Practice
          </ButtonLink>
          <div className="hero__secondary">
            <ButtonLink to="/statistics" variant="secondary" block>
              <span aria-hidden="true">📊</span> View Statistics
            </ButtonLink>
            <ButtonLink to="/settings" variant="secondary" block>
              <span aria-hidden="true">⚙️</span> Settings
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
