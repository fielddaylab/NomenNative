.PHONY: default

default: plants/conifers.js plants/mcgee_A_L.js plants/broadleaf_trees.js

plants/conifers.js: plants/conifers.csv
	ruby data_to_js.rb plants/conifers.csv plants/conifers.js

plants/mcgee_A_L.js: plants/mcgee_A_L.csv
	ruby data_to_js.rb plants/mcgee_A_L.csv plants/mcgee_A_L.js

plants/broadleaf_trees.js: plants/broadleaf_trees.csv
	ruby data_to_js.rb plants/broadleaf_trees.csv plants/broadleaf_trees.js
