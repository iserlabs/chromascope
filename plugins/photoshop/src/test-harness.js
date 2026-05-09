var _active = false;
var _onMessage = null;

function activate(renderFn, getSettingsFn, updateSettingsFn, getLastBufferFn) {
  _active = true;

  _onMessage = function (msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case "test:getStatus":
        return {
          type: "test:status",
          active: true,
          ready: true,
        };

      case "test:setConfig":
        updateSettingsFn(msg.settings);
        return { type: "test:configSet" };

      case "test:render":
        renderFn(null, false);
        return { type: "test:renderStarted" };

      case "test:extractImage":
        var buf = getLastBufferFn();
        if (!buf) return { type: "test:image", data: null, error: "no render available" };
        // Chunked fromCharCode keeps the call stack within UXP's argument
        // limit. Per-byte string concatenation (the previous approach) is
        // O(n²) and stalls the panel for ~50ms on a 300² buffer.
        var CHUNK = 0x8000;
        var parts = "";
        for (var off = 0; off < buf.length; off += CHUNK) {
          parts += String.fromCharCode.apply(
            null,
            buf.subarray(off, Math.min(off + CHUNK, buf.length))
          );
        }
        // Buffer is always size² × 4 RGBA. Round to nearest int so a future
        // non-power-of-2 size still reports a sane integer dimension.
        var dim = Math.round(Math.sqrt(buf.length / 4));
        return {
          type: "test:image",
          data: btoa(parts),
          width: dim,
          height: dim,
        };

      case "test:stop":
        _active = false;
        return { type: "test:stopped" };

      default:
        return null;
    }
  };
}

function isActive() {
  return _active;
}

function handleMessage(msg) {
  if (!_active || !_onMessage) return null;
  return _onMessage(msg);
}

module.exports = { activate, isActive, handleMessage };
