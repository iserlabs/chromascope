-- plugins/lightroom/chromascope.lrdevplugin/utils.lua  (Chromascope)
-- Pure-logic utilities: no LrC SDK dependencies.
-- Works both inside Lightroom Classic (via require) and with a standalone
-- Lua 5.4 interpreter for testing.

local M = {}

local HASH_SKIP = {
  ToolkitIdentifier = true,
  ProcessVersion = true,
  CameraProfileDigest = true,
}

local function _keyLess(a, b)
  local ta, tb = type(a), type(b)
  if ta ~= tb then return ta < tb end
  if ta == "number" or ta == "string" then return a < b end
  return tostring(a) < tostring(b)
end

-- Hot-path constants and locals for hashTable. Lifting `string.byte`,
-- `string.sub`, `math.floor`, etc. into upvalues avoids a global table lookup
-- on every byte/number mixed; this runs ~50–200 keys per poll, every 500ms.
local _byte  = string.byte
local _floor = math.floor
local _type  = type
local _tostring = tostring
local _pairs = pairs
local _sort  = table.sort
local HASH_MOD = 2147483647

function M.hashTable(settings, seed)
  if not settings then return seed end

  local hash = seed % HASH_MOD

  -- mixStr / mixNum are inlined into walk to avoid creating two closures
  -- per call (which would be re-created on every hashTable invocation).
  local function walk(t, depth)
    if depth > 8 then return end
    local keys, ki = {}, 0
    for k in _pairs(t) do
      local kt = _type(k)
      if kt ~= "table" and kt ~= "userdata" and not HASH_SKIP[k] then
        ki = ki + 1
        keys[ki] = k
      end
    end
    _sort(keys, _keyLess)
    for i = 1, ki do
      local k = keys[i]
      -- mixStr(tostring(k))
      local sk = _tostring(k)
      for j = 1, #sk do
        hash = (hash * 33 + _byte(sk, j)) % HASH_MOD
      end
      hash = (hash * 33) % HASH_MOD

      local v  = t[k]
      local tv = _type(v)
      if tv == "table" then
        -- mixStr("{")
        hash = (hash * 33 + 123) % HASH_MOD -- 123 = byte('{')
        hash = (hash * 33) % HASH_MOD
        walk(v, depth + 1)
        -- mixStr("}")
        hash = (hash * 33 + 125) % HASH_MOD -- 125 = byte('}')
        hash = (hash * 33) % HASH_MOD
      elseif tv == "number" then
        local scaled = _floor(v * 100000 + 0.5)
        hash = (hash * 33 + (scaled % HASH_MOD)) % HASH_MOD
        hash = (hash * 33) % HASH_MOD
      elseif tv == "string" then
        for j = 1, #v do
          hash = (hash * 33 + _byte(v, j)) % HASH_MOD
        end
        hash = (hash * 33) % HASH_MOD
      elseif tv == "boolean" then
        hash = (hash * 33 + (v and 116 or 102)) % HASH_MOD -- 't' / 'f'
        hash = (hash * 33) % HASH_MOD
      end
    end
  end

  walk(settings, 0)
  return hash
end

function M.nextFrameIndex(currentIndex)
  return (currentIndex % 2) + 1
end

function M.framePath(prefix, index)
  return prefix .. "scope_" .. (index - 1) .. ".jpg"
end

-- ---------------------------------------------------------------------------
-- Overlay-flag whitelists — must match the processor's CLI accept list.
-- See packages/processor/src/render/mod.rs (resolve_zone_color, modes,
-- color spaces) and main.rs (validate_render_options). These tables are the
-- single source of truth on the Lua side; ImagePipeline.lua re-exports them.
-- ---------------------------------------------------------------------------

M.VALID_SCHEMES = {
  complementary = true, splitComplementary = true,
  triadic = true, tetradic = true, analogous = true,
}

M.VALID_COLORS = {
  white = true, yellow = true, cyan = true,
  green = true, magenta = true, orange = true,
}

M.VALID_DENSITY = { scatter = true, bloom = true, heatmap = true }

M.VALID_COLOR_SPACE = { hsl = true, ycbcr = true, cieluv = true }

-- Append `--scheme/--rotation/--hide-skin-tone/--overlay-color/--density/
-- --color-space` flags to a base CLI string based on the dialog `props` table.
--
-- Pure function. Does NOT shell-quote (the caller already wraps the binary
-- path in quotes); whitelists guarantee the appended values are token-safe.
-- Unknown / default values are dropped to keep the command line minimal,
-- which makes test diffs and CI logs readable.
function M.appendOverlayFlags(cmd, props)
  local scheme = props.scheme
  if scheme and scheme ~= "none" and M.VALID_SCHEMES[scheme] then
    cmd = cmd .. string.format(
      ' --scheme "%s" --rotation %d',
      scheme, math.floor((props.rotation or 0) + 0.5) % 360
    )
  end
  if props.skinTone == false then
    cmd = cmd .. ' --hide-skin-tone'
  end
  local overlayColor = props.overlayColor
  if overlayColor and overlayColor ~= "" and M.VALID_COLORS[overlayColor] then
    cmd = cmd .. string.format(' --overlay-color "%s"', overlayColor)
  end
  local density = props.density
  if density and density ~= "" and density ~= "scatter" and M.VALID_DENSITY[density] then
    cmd = cmd .. string.format(' --density "%s"', density)
  end
  local colorSpace = props.colorSpace
  if colorSpace and colorSpace ~= "" and colorSpace ~= "hsl" and M.VALID_COLOR_SPACE[colorSpace] then
    cmd = cmd .. string.format(' --color-space "%s"', colorSpace)
  end
  return cmd
end

return M
