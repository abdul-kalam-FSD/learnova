import { Component } from "react";
import "../Portal.css";

// Games already have their own boundary (LazyGameBoundary, for a
// failed chunk download specifically) but nothing previously caught
// an uncaught render error anywhere else in the app — Admin/Teacher/
// Student pages, the public home, auth pages. Before this, any bug
// in a render path (a null a page didn't expect, a bad API shape)
// would take the whole React tree down to a blank white screen with
// no way back short of manually editing the URL. React error
// boundaries must be class components — there's no hook equivalent
// for componentDidCatch.
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in app render:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="portal-entry">
          <div className="portal-entry__card">
            <div className="portal-entry__icon" aria-hidden="true">
              ⚠️
            </div>
            <p className="portal-entry__eyebrow">Something went wrong</p>
            <h1 className="portal-entry__title">This page hit an unexpected error</h1>
            <p className="portal-entry__tagline">
              Nothing you did caused this — reloading usually fixes it. If it keeps
              happening, head back to the homepage instead.
            </p>
            <div className="portal-entry__actions">
              <button type="button" className="btn-primary portal-entry__signin" onClick={this.handleReload}>
                Reload page
              </button>
              <a href="/" className="portal-entry__back">
                ← Back to home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
