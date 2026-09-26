export function Loading() {
  return <div className="container" style={{ padding: '160px 0 80px', textAlign: 'center' }}><i className="fa fa-spinner fa-spin fa-2x"></i></div>
}

export function ErrorBox({ error }: { error: Error }) {
  return <div className="container" style={{ paddingTop: 160 }}><div className="form-notice is-error">{error.message}</div></div>
}
