import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  handleReset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="grid min-h-40 place-items-center rounded-xl bg-destructive/10 p-6">
            <div className="text-center">
              <p className="font-semibold text-destructive">出错了</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {this.state.error.message}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={this.handleReset}
              >
                重试
              </Button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
