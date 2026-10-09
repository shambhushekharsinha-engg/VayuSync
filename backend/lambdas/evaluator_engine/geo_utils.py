"""
vayusync.lambdas.shared.geo_utils
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Geospatial utilities for the VayuSync smoke trajectory pipeline.

All calculations use the WGS-84 ellipsoid approximated as a sphere
(Earth radius = 6371 km), which provides < 0.3% error at mid-latitudes --
sufficient for 6-12 h smoke trajectory estimation.

Coordinate convention throughout: (latitude, longitude) in decimal degrees.
Wind component convention (meteorological):
  u_wind > 0 -> blowing toward the east
  v_wind > 0 -> blowing toward the north
"""

import math
import logging

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
EARTH_RADIUS_KM = 6371.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi

# Default cone half-angle (degrees) -- represents atmospheric dispersion spread.
# 15 degrees is empirically consistent with Pasquill-Gifford Stability Class D
# (neutral stability), typical of daytime stubble-burning conditions.
DEFAULT_CONE_HALF_ANGLE_DEG = 15.0

# Number of arc vertices used to approximate the fan of the cone polygon
CONE_ARC_VERTICES = 9


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth.

    Parameters
    ----------
    lat1, lon1 : float
        Origin latitude and longitude in decimal degrees.
    lat2, lon2 : float
        Destination latitude and longitude in decimal degrees.

    Returns
    -------
    float
        Distance in kilometres.
    """
    phi1 = lat1 * DEG_TO_RAD
    phi2 = lat2 * DEG_TO_RAD
    dphi = (lat2 - lat1) * DEG_TO_RAD
    dlambda = (lon2 - lon1) * DEG_TO_RAD

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def destination_point(
    lat: float, lon: float, bearing_deg: float, distance_km: float
) -> tuple:
    """
    Calculate the destination point given start coordinates, bearing, and distance.

    Uses the spherical-Earth forward-geodetic formula (Vincenty simplified).

    Parameters
    ----------
    lat, lon : float
        Starting latitude and longitude in decimal degrees.
    bearing_deg : float
        Forward bearing in degrees clockwise from North (0-360).
    distance_km : float
        Distance to travel in kilometres.

    Returns
    -------
    tuple
        (destination_latitude, destination_longitude) in decimal degrees.
    """
    phi1 = lat * DEG_TO_RAD
    lambda1 = lon * DEG_TO_RAD
    theta = bearing_deg * DEG_TO_RAD
    delta = distance_km / EARTH_RADIUS_KM  # angular distance

    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta)
        + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    )
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2),
    )
    # Normalise longitude to -180...+180
    lambda2 = (lambda2 + 3 * math.pi) % (2 * math.pi) - math.pi

    return (phi2 * RAD_TO_DEG, lambda2 * RAD_TO_DEG)


def calculate_trajectory_cone(
    lat: float,
    lon: float,
    u_wind: float,
    v_wind: float,
    thermal_power_mw: float = 1000.0,
    hours: float = 6.0,
    cone_half_angle: float = DEFAULT_CONE_HALF_ANGLE_DEG,
) -> dict:
    """
    Generate a GeoJSON Polygon representing the downwind smoke trajectory cone.

    The cone is modelled using a simplified Lagrangian dispersion approach:
      - The centreline follows the mean wind vector.
      - The cone widens linearly from the fire source at +/- cone_half_angle degrees.
      - The far edge is approximated by a circular arc of (arc_vertices) points.

    Algorithm
    ---------
    1. Derive wind bearing from (u, v) components (meteorological convention).
    2. Compute the downwind distance D = wind_speed x travel_time.
    3. Scale D upward by a buoyancy factor derived from thermal_power_mw
       (higher FRP -> greater plume rise -> longer effective transport distance).
    4. Place the cone tip at (lat, lon) and the arc at distance D in direction
       bearing +/- cone_half_angle.

    Parameters
    ----------
    lat, lon : float
        Fire hotspot origin coordinates.
    u_wind : float
        Eastward wind component (m/s).  Negative = wind blowing from west.
    v_wind : float
        Northward wind component (m/s). Negative = wind blowing from north.
    thermal_power_mw : float
        Fire Radiative Power (MW) -- used for buoyancy correction.
    hours : float
        Trajectory prediction window (hours). Default 6 h.
    cone_half_angle : float
        Half-angle of the dispersion cone in degrees. Default 15 degrees.

    Returns
    -------
    dict
        GeoJSON Polygon Feature dict with metadata in properties.
    """
    # Wind vector -> trajectory bearing:
    # A north-westerly wind (u_wind < 0 westerly, v_wind < 0 northerly)
    # carries smoke downwind towards the south-east (bearing ~115-150 deg).
    # atan2(-u_wind, v_wind) yields the downwind travel bearing clockwise from North.
    bearing_rad = math.atan2(-u_wind, v_wind)
    bearing_deg = (math.degrees(bearing_rad) + 360) % 360  # 0-360, clockwise from N

    wind_speed_ms = math.sqrt(u_wind ** 2 + v_wind ** 2)
    wind_speed_kmh = wind_speed_ms * 3.6

    # ── 2. Base transport distance ────────────────────────────────────────────
    base_distance_km = (wind_speed_ms * 3600 * hours) / 1000

    # ── 3. Buoyancy / plume-rise correction ───────────────────────────────────
    # Empirically derived from Briggs (1975) plume-rise equations.
    # Extra distance is proportional to FRP^0.3 (dimensionless scaling).
    buoyancy_factor = 1.0 + 0.08 * (thermal_power_mw / 1000.0) ** 0.3
    transport_distance_km = base_distance_km * buoyancy_factor

    if transport_distance_km < 1.0:
        # Degenerate case: calm winds -- create a small circular buffer instead
        transport_distance_km = 5.0
        cone_half_angle = 60.0

    logger.debug(
        "Cone calc: bearing=%.1f deg, speed=%.2f m/s, dist=%.1f km (buoyancy x %.2f)",
        bearing_deg,
        wind_speed_ms,
        transport_distance_km,
        buoyancy_factor,
    )

    # ── 4. Build cone polygon vertices ────────────────────────────────────────
    # Tip = fire source
    tip = [lon, lat]  # GeoJSON uses [lon, lat] order

    # Fan arc: CONE_ARC_VERTICES points from (bearing - half_angle)
    #          to (bearing + half_angle) at distance transport_distance_km
    left_bearing = (bearing_deg - cone_half_angle) % 360
    right_bearing = (bearing_deg + cone_half_angle) % 360

    arc_bearings = _linspace_bearing(left_bearing, right_bearing, CONE_ARC_VERTICES)
    arc_points = []
    for b in arc_bearings:
        dest_lat, dest_lon = destination_point(lat, lon, b, transport_distance_km)
        arc_points.append([dest_lon, dest_lat])

    # Polygon: tip -> left edge -> arc -> right edge -> back to tip
    ring = [tip] + arc_points + [tip]

    # ── 5. Compute bounding box for fast institution pre-filtering ────────────
    all_lats = [lat] + [p[1] for p in arc_points]
    all_lons = [lon] + [p[0] for p in arc_points]
    bbox = {
        "min_lat": min(all_lats),
        "max_lat": max(all_lats),
        "min_lon": min(all_lons),
        "max_lon": max(all_lons),
    }

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "origin_lat": lat,
            "origin_lon": lon,
            "bearing_deg": round(bearing_deg, 2),
            "wind_speed_ms": round(wind_speed_ms, 3),
            "wind_speed_kmh": round(wind_speed_kmh, 2),
            "transport_distance_km": round(transport_distance_km, 2),
            "buoyancy_factor": round(buoyancy_factor, 4),
            "cone_half_angle_deg": cone_half_angle,
            "hours": hours,
            "thermal_power_mw": thermal_power_mw,
            "bbox": bbox,
        },
    }


def point_in_polygon(lat: float, lon: float, polygon_coords: list) -> bool:
    """
    Ray-casting algorithm to test whether a point lies inside a GeoJSON polygon ring.

    Parameters
    ----------
    lat, lon : float
        Point to test, in decimal degrees.
    polygon_coords : list
        Outer ring of a GeoJSON Polygon -- list of [lon, lat] pairs.

    Returns
    -------
    bool
        True if the point is inside the polygon (or on the boundary).
    """
    x, y = lon, lat  # GeoJSON convention: [lon, lat]
    n = len(polygon_coords)
    inside = False
    j = n - 1

    for i in range(n):
        xi, yi = polygon_coords[i]
        xj, yj = polygon_coords[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside


def latlon_to_geohash(lat: float, lon: float, precision: int = 6) -> str:
    """
    Encode a (lat, lon) coordinate pair into a geohash string.

    This is a pure-Python implementation that does NOT depend on the
    python-geohash C extension, making it safe for AWS Lambda cold starts.
    The result is identical to the standard geohash algorithm.

    Parameters
    ----------
    lat, lon : float
        Latitude and longitude in decimal degrees.
    precision : int
        Number of geohash characters (default 6 -> ~1.2 km grid cells).

    Returns
    -------
    str
        Geohash string of length precision.
    """
    _BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit_idx = 0
    char_idx = 0
    even = True  # Start with longitude

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2
            if lon >= mid:
                char_idx |= bits[bit_idx]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if lat >= mid:
                char_idx |= bits[bit_idx]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid

        even = not even
        if bit_idx < 4:
            bit_idx += 1
        else:
            geohash.append(_BASE32[char_idx])
            bit_idx = 0
            char_idx = 0

    return "".join(geohash)


def bounding_box_to_institution_filter(bbox: dict) -> tuple:
    """
    Return (min_lat, max_lat, min_lon, max_lon) from a trajectory cone bbox dict.
    Adds a small buffer (0.1 degrees) to catch institutions on the cone edge.
    """
    buffer = 0.1  # ~11 km margin
    return (
        bbox["min_lat"] - buffer,
        bbox["max_lat"] + buffer,
        bbox["min_lon"] - buffer,
        bbox["max_lon"] + buffer,
    )


def estimate_pm25_at_institution(
    hotspot_frp_mw: float,
    distance_km: float,
    wind_speed_ms: float,
    mixing_height_m: float = 700.0,
) -> float:
    """
    Estimate ground-level PM2.5 concentration (ug/m^3) at a receptor location
    using a simplified Gaussian Plume model.

    This is intentionally a rough estimate (+/- 30%) for advisory purposes only.
    For regulatory purposes use CALPUFF or HYSPLIT.

    Parameters
    ----------
    hotspot_frp_mw : float
        Fire Radiative Power (MW) -- proxy for smoke emission rate.
    distance_km : float
        Straight-line distance from fire to institution.
    wind_speed_ms : float
        Mean wind speed (m/s) along the transport path.
    mixing_height_m : float
        Atmospheric boundary layer mixing height (m). Lower = more concentrated.

    Returns
    -------
    float
        Estimated PM2.5 concentration in ug/m^3, capped at 999.
    """
    if distance_km <= 0 or wind_speed_ms <= 0:
        return 999.0

    # Emission rate proxy: 1 MW FRP ~ 0.4 g/s PM2.5 (van der Werf et al., 2010)
    Q_gs = hotspot_frp_mw * 0.4           # g/s
    Q_ugm3_ms = Q_gs * 1e6                 # ug/s (pre-scaled for Gaussian formula)

    distance_m = distance_km * 1000.0

    # Dispersion coefficients (Pasquill-Gifford Stability Class D, rural)
    sigma_y = 0.128 * distance_m ** 0.90  # horizontal spread (m)
    sigma_z = 0.093 * distance_m ** 0.85  # vertical spread (m), capped at mixing height
    sigma_z = min(sigma_z, mixing_height_m / 2)

    # Ground-level centreline concentration
    concentration = (
        Q_ugm3_ms
        / (2 * math.pi * sigma_y * sigma_z * wind_speed_ms)
    )

    # Add background PM2.5 for October Delhi
    # WHO guideline is 15 ug/m^3; Delhi October baseline is typically 60-90 ug/m^3
    background_pm25 = 75.0
    total = concentration + background_pm25

    return min(round(total, 1), 999.0)


# ─────────────────────────────────────────────────────────────────────────────
# PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────────────────────


def _linspace_bearing(start: float, end: float, n: int) -> list:
    """
    Generate n evenly-spaced bearings from start to end,
    correctly handling the 0/360 degree wraparound.
    """
    if start <= end:
        step = (end - start) / (n - 1)
        return [start + i * step for i in range(n)]
    else:
        # Wrap around: e.g. start=350, end=10 -> span=20 degrees
        span = (end + 360 - start) % 360
        step = span / (n - 1)
        return [(start + i * step) % 360 for i in range(n)]


# ─── Backward-compatibility aliases ──────────────────────────────────────────

def bounding_box_from_cone(cone_geojson: dict) -> dict:
    """
    Compatibility alias: extract bounding box from a trajectory cone GeoJSON Feature.
    Returns dict with min_lat, max_lat, min_lon, max_lon keys.
    """
    coords = cone_geojson["geometry"]["coordinates"][0]
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return {
        "min_lat": min(lats),
        "max_lat": max(lats),
        "min_lon": min(lons),
        "max_lon": max(lons),
    }


def point_in_bounding_box(lat: float, lon: float, bbox: dict) -> bool:
    """Fast bounding-box pre-filter before precise polygon containment check."""
    return (
        bbox["min_lat"] <= lat <= bbox["max_lat"]
        and bbox["min_lon"] <= lon <= bbox["max_lon"]
    )
