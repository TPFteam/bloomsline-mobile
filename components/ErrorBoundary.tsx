/**
 * App-wide error boundary.
 *
 * React error boundaries must be class components (no hook equivalent), so
 * this is intentionally a class. Mount it once at the root of the app
 * (around <Stack/> in `app/_layout.tsx`) and any render-time error that
 * bubbles up gets:
 *
 *   1. Logged via `captureError()` → PostHog (`client_error` event) +
 *      Sentry (if EXPO_PUBLIC_SENTRY_DSN is set).
 *   2. Replaced with a calm recovery UI that lets the user try again
 *      (re-mounts the children) or restart the relevant view.
 *
 * Async errors thrown outside of React's render path (event handlers,
 * setTimeout, promise rejections) won't be caught here — those should be
 * handled with try/catch + `captureError()` at the source.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { captureError } from '@/lib/analytics'

interface Props {
  children: React.ReactNode
  /** Optional override for the fallback UI. Receives the error + a reset fn. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, {
      component_stack: info.componentStack || null,
      scope: 'app_root',
    })
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            An unexpected error happened. We&apos;ve logged it. Try again, and if it keeps
            happening, restart the app.
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 18,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
})
