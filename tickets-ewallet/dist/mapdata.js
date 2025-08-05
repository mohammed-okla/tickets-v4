var simplemaps_countrymap_mapdata={
  main_settings: {
    //General settings
		width: "responsive", //or 'responsive'
    background_color: "#FFFFFF",
    background_transparent: "yes",
    border_color: "#ffffff",
    pop_ups: "detect",
    
		//State defaults
		state_description: "State description",
    state_color: "#88A4BC",
    state_hover_color: "#3B729F",
    state_url: "",
    border_size: 1.5,
    all_states_inactive: "no",
    all_states_zoomable: "yes",
    
		//Location defaults
		location_description: "Location description",
    location_url: "",
    location_color: "#FF0067",
    location_opacity: 0.8,
    location_hover_opacity: 1,
    location_size: 25,
    location_type: "square",
    location_image_source: "frog.png",
    location_border_color: "#FFFFFF",
    location_border: 2,
    location_hover_border: 2.5,
    all_locations_inactive: "no",
    all_locations_hidden: "no",
    
		//Label defaults
		label_color: "#ffffff",
    label_hover_color: "#ffffff",
    label_size: 16,
    label_font: "Arial",
    label_display: "auto",
    label_scale: "yes",
    hide_labels: "no",
    hide_eastern_labels: "no",
   
		//Zoom settings
		zoom: "yes",
    manual_zoom: "yes",
    back_image: "no",
    initial_back: "no",
    initial_zoom: "-1",
    initial_zoom_solo: "no",
    region_opacity: 1,
    region_hover_opacity: 0.6,
    zoom_out_incrementally: "yes",
    zoom_percentage: 0.99,
    zoom_time: 0.5,
    
		//Popup settings
		popup_color: "white",
    popup_opacity: 0.9,
    popup_shadow: 1,
    popup_corners: 5,
    popup_font: "12px/1.5 Verdana, Arial, Helvetica, sans-serif",
    popup_nocss: "no",
    
		//Advanced settings
		div: "map",
    auto_load: "yes",
    url_new_tab: "no",
    images_directory: "default",
    fade_time: 0.1,
    link_text: "View Website"
  },
  state_specific: {
    SYDI: {
      name: "Damascus",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYDR: {
      name: "Dar`a",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYDY: {
      name: "Dayr Az Zawr",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYHA: {
      name: "Hasaka (Al Haksa)",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYHI: {
      name: "Homs (Hims)",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYHL: {
      name: "Aleppo",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYHM: {
      name: "Hamah",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYID: {
      name: "Idlib",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYLA: {
      name: "Lattakia",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYQU: {
      name: "Quneitra",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYRA: {
      name: "Ar Raqqah",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYRD: {
      name: "Rif Dimashq",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYSU: {
      name: "As Suwayda'",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    SYTA: {
      name: "Tartus",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    }
  },
  locations: {
    "0": {
      name: "Damascus",
      lat: "33.512529",
      lng: "36.278016"
    }
  },
  labels: {
    SYDI: {
      name: "Damascus",
      parent_id: "SYDI"
    },
    SYDR: {
      name: "Dar`a",
      parent_id: "SYDR"
    },
    SYDY: {
      name: "Dayr Az Zawr",
      parent_id: "SYDY"
    },
    SYHA: {
      name: "Hasaka (Al Haksa)",
      parent_id: "SYHA"
    },
    SYHI: {
      name: "Homs (Hims)",
      parent_id: "SYHI"
    },
    SYHL: {
      name: "Aleppo",
      parent_id: "SYHL"
    },
    SYHM: {
      name: "Hamah",
      parent_id: "SYHM"
    },
    SYID: {
      name: "Idlib",
      parent_id: "SYID"
    },
    SYLA: {
      name: "Lattakia",
      parent_id: "SYLA"
    },
    SYQU: {
      name: "Quneitra",
      parent_id: "SYQU"
    },
    SYRA: {
      name: "Ar Raqqah",
      parent_id: "SYRA"
    },
    SYRD: {
      name: "Rif Dimashq",
      parent_id: "SYRD"
    },
    SYSU: {
      name: "As Suwayda'",
      parent_id: "SYSU"
    },
    SYTA: {
      name: "Tartus",
      parent_id: "SYTA"
    }
  }
};