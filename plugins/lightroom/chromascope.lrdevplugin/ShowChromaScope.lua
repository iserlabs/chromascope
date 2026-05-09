-- plugins/lightroom/chromascope.lrdevplugin/ShowChromascope.lua

local LrFunctionContext = import "LrFunctionContext"
local LrTasks           = import "LrTasks"

require "ChromascopeDialog"

LrTasks.startAsyncTask(function()
  LrFunctionContext.callWithContext("ShowChromascope", function(context)
    ChromascopeDialog.show(context)
  end)
end)
