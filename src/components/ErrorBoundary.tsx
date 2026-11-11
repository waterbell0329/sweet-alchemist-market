import { Component, type ReactNode } from 'react';
import { clearGame } from '../store/persistence';
import { translate } from '../i18n';

interface State {
  error: Error | null;
}

/** Keeps a render error from leaving the classroom screen black. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Sweet Alchemist Market]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center bg-choco p-8 text-cream">
        <div className="panel max-w-[760px] p-8">
          <h1 className="text-[34px] font-bold text-gold">{translate('id', 'errorTitle')}</h1>
          <p className="font-ko text-[20px] opacity-80">{translate('ko', 'errorTitle')}</p>
          <p className="mt-4 text-[20px]">{translate('id', 'errorBody')}</p>
          <p className="font-ko text-[17px] opacity-80">{translate('ko', 'errorBody')}</p>
          <pre className="mt-4 max-h-[120px] overflow-auto bg-black p-3 text-[13px] text-coral">{String(this.state.error.message)}</pre>
          <div className="mt-6 flex gap-4">
            <button type="button" className="btn btn-choco focus-ring h-[60px] px-6 text-[18px]" onClick={() => this.setState({ error: null })}>
              {translate('id', 'errorRetry')} · {translate('ko', 'errorRetry')}
            </button>
            <button
              type="button"
              className="btn btn-coral focus-ring h-[60px] px-6 text-[18px]"
              onClick={() => {
                clearGame();
                window.location.reload();
              }}
            >
              {translate('id', 'errorReset')} · {translate('ko', 'errorReset')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
