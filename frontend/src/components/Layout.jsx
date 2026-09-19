import PropTypes from 'prop-types'
import Navbar from './Navbar'

/**
 * Main layout wrapper with navigation
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="page-enter max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        {children}
      </main>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
