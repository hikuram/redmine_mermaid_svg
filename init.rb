# frozen_string_literal: true

require 'securerandom'
require_relative 'lib/redmine_mermaid_svg/hook_listener'

Redmine::Plugin.register :redmine_mermaid_svg do
  name 'Redmine Mermaid SVG'
  author 'Far End Technologies Corporation and derivative contributors'
  description 'Adds a local Mermaid macro with client-side SVG download.'
  requires_redmine version_or_higher: '6.0'
  version '0.1.0'
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
      content_tag(:div, text, class: 'mermaid', id: diagram_id)
    end
  end
end
