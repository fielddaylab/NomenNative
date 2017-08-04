#!/usr/bin/env ruby

require 'json'

if ARGV.length != 2
  puts "Usage: #{$0} input.txt output.js"
  exit 1
end

data = File.read(ARGV[0])

js = "// @flow

'use strict';

export default #{data.to_json};
"

File.write(ARGV[1], js)
