import { Link } from 'react-router-dom';

interface Props {
  small?: boolean;
}

export default function BrandHeader({ small = false }: Props) {
  return (
    <header className={`w-full ${small ? 'py-4' : 'py-6'} border-b border-ink-100 bg-white/60 backdrop-blur-sm`}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-accent-500 flex items-center justify-center text-white font-display font-bold">
            M
          </div>
          <div>
            <div className={`font-display font-semibold text-ink-900 leading-none ${small ? 'text-base' : 'text-lg'}`}>
              Mosaic Insurance Group
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 mt-1">
              Trainee Assessment
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
