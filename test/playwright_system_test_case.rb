# frozen_string_literal: true

require_relative '../../../test/test_helper'

class PlaywrightSystemTestCase < ActionDispatch::SystemTestCase
  PLAYWRIGHT_CLI = File.expand_path('../node_modules/.bin/playwright', __dir__)

  driven_by(
    :playwright,
    options: {
      headless: true,
      browser_type: :chromium,
      playwright_cli_executable_path: PLAYWRIGHT_CLI
    }
  )

  # Should not depend on locale since Redmine displays login page
  # using default browser locale which depend on system locale for "real" browsers drivers
  def log_user(login, password)
    visit '/my/page'
    assert_equal '/login', current_path
    within('#login-form form') do
      fill_in 'username', :with => login
      fill_in 'password', :with => password
      find('input[name=login]').click
    end
    assert_equal '/my/page', current_path
  end
end
