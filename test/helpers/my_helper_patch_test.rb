# frozen_string_literal: true

require_relative '../../../../test/test_helper'

class MyHelperPatchTest < Redmine::HelperTest
  include MyHelper

  def setup
    @user = User.find(2)
  end

  def test_block_select_tag_should_not_include_replace_select2_script_when_setting_is_disabled
    with_settings :plugin_redmica_ui_extension => {'searchable_selectbox' => {'enabled' => 0}} do
      refute_includes block_select_tag(@user), 'replaceSelect2();'
    end
  end

  def test_block_select_tag_should_include_replace_select2_script_when_setting_is_enabled
    with_settings :plugin_redmica_ui_extension => {'searchable_selectbox' => {'enabled' => 1}} do
      assert_includes block_select_tag(@user), 'replaceSelect2();'
    end
  end
end
