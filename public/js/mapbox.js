export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidHlzb25wIiwiYSI6ImNrcWg2NmVzMTFqMHAyd252OGxtdGZxNHQifQ.hQqZ0Bof_tLCLFbb_9w95w';
  var map = new mapboxgl.Map({
    container: 'map',
    //Id has to be map tp use this container map
    style: 'mapbox://styles/tysonp/ckqh6szle1b6b17o3flf99y6y',
    scrollZoom: false,
    //   center: [-118.339476, 34.01903],
    //   zoom: 8,
    //   interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //create marker
    const el = document.createElement('div');
    el.className = 'marker';
    //Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day: ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 200,
      right: 200,
    },
  });
};
