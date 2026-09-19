import PropTypes from 'prop-types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Stat card component
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Display value
 * @param {string} props.change - Change indicator
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.color - Color theme (blue, green, red, purple)
 */
function StatCard({ title, value, change = null, icon: Icon = null, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }

  const getTrendIcon = () => {
    if (change?.startsWith('+')) return TrendingUp
    if (change?.startsWith('-')) return TrendingDown
    return Minus
  }

  const TrendIcon = getTrendIcon()

  return (
    <div className="card hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-100">{value}</h4>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className="w-4 h-4" />
              <span
                className={`text-sm ${
                  change.startsWith('+')
                    ? 'text-green-400'
                    : change.startsWith('-')
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-lg border ${colorClasses[color]}`}
        >
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </div>
  )
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.string,
  icon: PropTypes.elementType,
  color: PropTypes.oneOf(['blue', 'green', 'red', 'purple', 'yellow']),
}

/**
 * Grid of stat cards
 * @param {Object} props
 * @param {Array} props.stats - Array of stat objects
 */
function StatCardGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}

StatCardGrid.propTypes = {
  stats: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export default StatCardGrid
export { StatCard }
