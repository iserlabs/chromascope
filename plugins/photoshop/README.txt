Chromascope for Adobe Photoshop
===============================

A chrominance vectorscope panel for Adobe Photoshop.
Plots pixel color on a circular graph with density visualizations
and harmony overlays.

Requirements
------------
- Adobe Photoshop 2022 (v23.3) or later
- macOS or Windows

Installation
------------
1. Open Photoshop.
2. Go to Plugins > Plugins Panel (or Plugins > Browse Plugins in older versions).
3. Click the "..." menu in the top-right corner and select
   "Import plugin from disk...".
4. Navigate to this folder and select the "manifest.json" file.
5. Chromascope will appear in the Plugins menu.

Alternatively, you can copy this entire folder to the Photoshop
UXP plugins directory:
  - macOS:  ~/Library/Application Support/Adobe/UXP/Plugins/External/
  - Windows: %APPDATA%\Adobe\UXP\Plugins\External\

After copying, restart Photoshop. The plugin will appear under
Plugins > Chromascope.

Usage
-----
1. Open an image in Photoshop.
2. Go to Plugins > Chromascope to open the panel.
3. The vectorscope updates automatically as you edit.

Controls:
- Type (density mode): Scatter (single dot per pixel),
  Heatmap (density-colored frequency map), or Bloom (soft glow).
- Scheme (harmony overlay): Off, Complementary, Split,
  Triadic, Tetradic, or Analogous.
- Rotation: rotate the harmony overlay around the wheel.
- Zone Width: widen or narrow the harmony zones.
- Skin: toggle the skin tone reference line (I-line at 123 degrees).

More Info
---------
https://chromascope.dev
https://github.com/kevinkiklee/chromascope
