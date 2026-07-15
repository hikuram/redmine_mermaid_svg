# frozen_string_literal: true

require 'securerandom'
require_relative 'lib/redmine_mermaid_svg/hook_listener'

Redmine::Plugin.register :redmine_mermaid_svg do
  name 'Redmine Mermaid SVG'
  author 'Far End Technologies Corporation and derivative contributors'
  description 'Adds a local Mermaid macro with SVG download and PNG clipboard copy.'
  requires_redmine version_or_higher: '6.0'
  version '1.1.0'
  url 'https://github.com/redmica/redmica_ui_extension'
  author_url 'https://github.com/redmica'
end

Redmine::WikiFormatting::Macros.register do
  desc <<~DESCRIPTION
    Convert the block text to a diagram using Mermaid.

    Example:

      {{mermaid
      flowchart LR
        A --> B
      }}
  DESCRIPTION

  macro :mermaid do |_obj, _args, text|
    diagram_id = "mermaid-#{SecureRandom.hex(10)}"

    content_tag(:div, class: 'mermaid-macro') do
      safe_join(
        [
          content_tag(:div, class: 'mermaid-toolbar') do
            safe_join(
              [
                content_tag(
                  :button,
                  sprite_icon('download', icon_only: true),
                  type: 'button',
                  class: 'icon-only icon-download mermaid-export-button mermaid-svg-download',
                  title: 'Download SVG',
                  :'aria-label' => 'Download SVG'
                ),
                content_tag(
                  :button,
                  sprite_icon('copy-link', icon_only: true),
                  type: 'button',
                  class: 'icon-only icon-copy-link mermaid-export-button mermaid-png-copy',
                  title: 'Copy PNG to clipboard',
                  :'aria-label' => 'Copy PNG to clipboard'
                )
              ]
            )
          end,
          content_tag(:div, text, class: 'mermaid', id: diagram_id)
        ]
      )
    end
  end
end
