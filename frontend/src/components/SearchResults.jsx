import PropTypes from 'prop-types'
import { ExternalLink, Search } from 'lucide-react'

/**
 * Individual search result card
 * @param {Object} props
 * @param {Object} props.result - Search result object
 */
function SearchResultCard({ result }) {
  return (
    <div className="card hover:border-slate-700 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-100 truncate group-hover:text-blue-400 transition-colors">
            {result.title}
          </h4>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {result.content}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-slate-500 truncate">
              {result.url}
            </span>
            <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400">
              Score: {result.score?.toFixed(2) || 'N/A'}
            </span>
          </div>
        </div>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}

SearchResultCard.propTypes = {
  result: PropTypes.shape({
    title: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    score: PropTypes.number,
  }).isRequired,
}

/**
 * Search results list component
 * @param {Object} props
 * @param {Array} props.results - Array of search results
 * @param {boolean} props.loading - Loading state
 * @param {string} props.query - Search query
 */
function SearchResults({ results = [], loading = false, query = '' }) {
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          <span>Searching for &quot;{query}&quot;...</span>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="card text-center py-12">
        <Search className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-slate-500">
          {query ? `No results found for "${query}"` : 'Enter a query to search'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Search Results</h3>
        <span className="text-sm text-slate-500">
          {results.length} results for &quot;{query}&quot;
        </span>
      </div>
      {results.map((result, index) => (
        <SearchResultCard key={index} result={result} />
      ))}
    </div>
  )
}

SearchResults.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  query: PropTypes.string,
}

export default SearchResults
export { SearchResultCard }
