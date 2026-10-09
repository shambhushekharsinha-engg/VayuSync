import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VayuSync ErrorBoundary caught runtime exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white p-6 text-center select-none font-sans">
          <div className="relative mb-4">
            <div className="text-5xl">🌬️</div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">
            Vayu<span className="text-orange-400">Sync</span> Dashboard
          </h1>
          <p className="text-gray-400 text-sm max-w-md mb-6 leading-relaxed">
            A temporary component render exception was safely contained. Click below to reload the real-time monitor.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
