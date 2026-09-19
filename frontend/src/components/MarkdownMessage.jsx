import PropTypes from 'prop-types'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function MarkdownMessage({ children, className = '' }) {
  return (
    <div className={`markdown-content ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children: linkChildren, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">{linkChildren}</a>
          ),
          code: ({ children: codeChildren, inline, ...props }) => {
            const codeProps = { ...props }
            delete codeProps.node
            return inline ? (
              <code className="rounded bg-slate-950 px-1.5 py-0.5 text-cyan-200" {...codeProps}>{codeChildren}</code>
            ) : (
              <code className={props.className} {...codeProps}>{codeChildren}</code>
            )
          },
        }}
      >
        {children || ''}
      </Markdown>
    </div>
  )
}

MarkdownMessage.propTypes = {
  children: PropTypes.string,
  className: PropTypes.string,
}

export default MarkdownMessage
