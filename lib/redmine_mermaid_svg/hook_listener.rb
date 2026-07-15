# frozen_string_literal: true

module RedmineMermaidSvg
  class HookListener < Redmine::Hook::ViewListener
    def view_layouts_base_html_head(_context)
      stylesheet_link_tag(
        'redmine_mermaid_svg/mermaid_macro',
        plugin: 'redmine_mermaid_svg'
      ) +
        javascript_include_tag(
          'redmine_mermaid_svg/mermaid.min.js',
          plugin: 'redmine_mermaid_svg'
        ) +
        javascript_include_tag(
          'redmine_mermaid_svg/mermaid_macro.js',
          plugin: 'redmine_mermaid_svg'
        )
    end
  end
end
