package org.noise_planet.noisemodelling.scripts

import org.h2gis.api.ProgressVisitor
import org.noise_planet.noisemodelling.scripts.Import_and_Export.Import_OSM
import org.noise_planet.noisemodelling.scripts.Import_and_Export.Export_Table
import org.noise_planet.noisemodelling.scripts.Receivers.Regular_Grid
import org.noise_planet.noisemodelling.scripts.NoiseModelling.Road_Emission_from_Traffic
import org.noise_planet.noisemodelling.scripts.NoiseModelling.Noise_level_from_source
import org.noise_planet.noisemodelling.scripts.Acoustic_Tools.Create_Isosurface

import org.locationtech.jts.io.WKTReader
import java.sql.Connection

/**
 * One area, from an OSM extract to three band polygons.
 *
 * This is the whole of the model now. Everything acoustic — emission by road
 * class, propagation, diffraction over and around buildings, reflections off
 * facades, ground effect — belongs to NoiseModelling, which implements
 * CNOSSOS-EU, the method the published maps this is checked against are
 * themselves made with. What is left here is the order the blocks run in.
 *
 * It replaced a hand written model. That model was measured against Berlin's
 * END facade levels and came out worse than the cruder one it had replaced:
 * 41.3% balanced accuracy against 57.2%, finding 8% of genuinely noisy places
 * against 87%. The reason was not a bad constant. Buildings both shield and
 * reflect, and a model that can only subtract cannot do both — see the git
 * history of bin/noise-bands and "Accuracy" in README.md.
 *
 * ScriptRunner takes no input arguments, so the parameters arrive as
 * environment variables. That is the whole reason this file has a preamble.
 */

title = 'Wayside noise bands'
description = 'One OSM extract to three band polygons, via CNOSSOS-EU'

inputs = [:]
outputs = [result: [name: 'result', title: 'result', type: String.class]]

static String env(String name, String fallback = null) {
    def value = System.getenv(name)
    if (value == null || value.trim().isEmpty()) {
        if (fallback == null) throw new IllegalStateException("$name is not set")
        return fallback
    }
    return value.trim()
}

def exec(Connection connection, Map input, ProgressVisitor progress) {
    def osmFile = env("WAYSIDE_OSM")
    def outputPath = env("WAYSIDE_OUTPUT")
    def srid = env("WAYSIDE_SRID")
    def fenceWkt = env("WAYSIDE_FENCE")
    def delta = env("WAYSIDE_DELTA", "25").toDouble()
    def maxSrcDist = env("WAYSIDE_MAX_SRC_DIST", "500").toDouble()
    def reflOrder = env("WAYSIDE_REFL_ORDER", "1").toInteger()
    def diffHorizontal = env("WAYSIDE_DIFF_HORIZONTAL", "false").toBoolean()

    def steps = progress.subProcess(6)

    // Roads carry predicted traffic flows from the OSM road class, which is
    // the one number OpenStreetMap does not hold and every model of this kind
    // has to guess. Guessed here by the people who wrote the propagation.
    //
    // removeTunnels because a road in a tunnel is not a source, which is the
    // single largest correction available from OSM tagging alone
    // Two arguments, not three. Import_OSM and Regular_Grid take no progress
    // visitor; the rest do. There is no way to tell from the outside, so this
    // matches each block's own signature
    new Import_OSM().exec(connection, [
            "pathFile"     : osmFile,
            "targetSRID"   : srid as Integer,
            "removeTunnels": true,
    ])
    steps.endStep()

    // Receivers on a grid over the area asked for, and nowhere else. Inside a
    // building is not a place anybody stands, and Regular_Grid drops those
    // for us given the buildings table
    def fence = new WKTReader().read(fenceWkt)
    new Regular_Grid().exec(connection, [
            "fence"            : fence,
            "buildingTableName": "BUILDINGS",
            "sourcesTableName" : "ROADS",
            "delta"            : delta,
            // 4 m above ground, which is the height END maps are computed at
            // and therefore the height the reference this is validated against
            // is measured at. See bin/validate-bands
            "height"           : 4.0,
    ])
    steps.endStep()

    def emission = new Road_Emission_from_Traffic().exec(connection, [
            "tableRoads": "ROADS",
    ], steps).result

    // The propagation itself. Both diffraction terms on: over the roofline and
    // around the corner are the two ways a courtyard gets quiet, and leaving
    // either off is the mistake the previous model made in a cruder form
    // The emission table goes in as tableSources, which is how the tutorial
    // shipped in the image does it. Passing it as tableSourcesEmission instead
    // makes the block read it as a per-period table and look for a PERIOD
    // column that Road_Emission_from_Traffic does not write
    new Noise_level_from_source().exec(connection, [
            "tableBuilding"       : "BUILDINGS",
            "tableSources"        : emission,
            "tableReceivers"      : "RECEIVERS",
            "tableGroundAbs"      : "GROUND",
            "confDiffVertical"    : true,
            "confDiffHorizontal"  : diffHorizontal,
            "confReflOrder"       : reflOrder,
            "confMaxSrcDist"      : maxSrcDist,
    ], steps)

    // Three classes, and the breaks are the band edges: under 55, 55 to 65,
    // 65 and over. The trailing 200 closes the last class. LAEQ is the field
    // the levels land in
    new Create_Isosurface().exec(connection, [
            "resultTable"      : "RECEIVERS_LEVEL",
            "resultTableField" : "LAEQ",
            "isoClass"         : "55.0,65.0,200.0",
            "smoothCoefficient": 1.0,
    ], steps)

    // ISOLVL is the class index the isosurface wrote, 0 for the first class.
    // The app reads `band`, one-based, so the query does the shift here rather
    // than a pass over the GeoJSON afterwards
    new Export_Table().exec(connection, [
            "exportPath"   : outputPath,
            "tableToExport": "(SELECT THE_GEOM, CAST(ISOLVL + 1 AS INTEGER) AS BAND FROM CONTOURING_NOISE_MAP)",
    ], steps)

    return "wrote $outputPath"
}
