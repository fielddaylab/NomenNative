#!/usr/bin/env ruby

require 'csv'
require 'fileutils'
require 'json'

# set this to the directory within your google drive
drive = '/Users/mtolly/gdrive-miketolly/Field Day/Projects and Events/Baldwin Siftr and Viola 2016_17/APP WORKING FILES'

def read_simple(csv)
  lines = CSV.readlines(csv)[1..-1]
  headers = lines[0].map do |header|
    if header == 'Scientific name'
      'name'
    else
      header
    end
  end
  lines[1..-1].map do |line|
    o = {}
    headers.each_with_index { |header, i| o[header] = line[i] }
    o
  end
end

shrubs = read_simple('broadleaf-shrubs.csv')
trees = read_simple('broadleaf-trees.csv')
conifers = read_simple('conifers.csv')

species_images = Dir["#{drive}/Images - SPECIES/**/*.{jpg,jpeg,png,JPG,JPEG,PNG}"]
trait_images = Dir["#{drive}/Images - TRAITS/**/*.{jpg,jpeg,png,JPG,JPEG,PNG}"]

all_scientific_names = [shrubs, trees, conifers].flatten.map { |s| s['name'] }
matched_species_images = {}
all_scientific_names.each do |name|
  species_dir = "species/#{name.gsub(' ', '-')}"
  FileUtils.mkdir_p(species_dir)
  matches = species_images.select { |img| img.include?(name) }
  converted = matches.map do |img|
    dest = "#{species_dir}/#{File.basename(img, '.*').gsub(' ', '-')}.jpg"
    unless File.exists?(dest)
      puts "Converting: #{dest}"
      system('convert', img, '-resize', '500x500', dest)
    end
    dest
  end
  matched_species_images[name] = converted
end

matched_trait_images = {}
trait_images.each do |image|
  k = File.basename(File.dirname(image)).gsub('_', ' ')
  v = File.basename(image, ".*").gsub('_', ' ')
  matched_trait_images[k] ||= {}
  dest = "traits/#{k.gsub(' ', '-')}/#{v.gsub(' ', '-')}.jpg"
  unless File.exists?(dest)
    FileUtils.mkdir_p(File.dirname(dest))
    system('convert', image, '-resize', '100x100', dest)
  end
  matched_trait_images[k][v] = dest
end

js = %{
'use strict';

export const db_broadleaf_shrubs = #{shrubs.to_json};
export const db_broadleaf_trees = #{trees.to_json};
export const db_conifers = #{conifers.to_json};

export const species_images = {
#{matched_species_images.each_pair.map do |species, images|
  "#{species.to_json}: [#{images.map { |image| "require(#{image.to_json})" }.join(', ')}]"
end.join(",\n")}
};

export const trait_images = {
#{matched_trait_images.each_pair.map do |k, vs|
  "#{k.to_json}: {#{
    vs.each_pair.map do |v, file|
      "#{v.to_json}: require(#{file.to_json})"
    end.join(', ')
  }}"
end.join(",\n")}
};

}
File.write('database.js', js);
