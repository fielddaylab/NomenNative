#!/usr/bin/env ruby

require 'csv'
require 'fileutils'
require 'json'

# set this to the correct directory within  google drive folder
drive = 'path/to/Baldwin Siftr and Viola App/APP WORKING FILES'

def read_simple(rowStart, csv)
  lines = CSV.readlines(csv)[rowStart..-1]
  headers = lines[0].map do |header|
    if header == 'Scientific name'
      'name'
    else
      header
    end
  end
  headers_combined = {}
  headers.each_with_index do |header, i|
    if header.match(/\d$/)
      header = header[0..-2]
    end
    headers_combined[header] = headers_combined.fetch(header, []) + [i]
  end
  lines[1..-1].map do |line|
    o = {}
    headers_combined.each_pair do |header, indexes|
      vals = indexes.map { |i| line[i] }.reject(&:nil?)
      o[header] = vals.empty? ? nil : vals.join(',')
    end
    o
  end
end

herbsforbs = read_simple(0, 'mcgee_A_L.csv')
shrubs = read_simple(1, 'broadleaf-shrubs.csv')
trees = read_simple(1, 'broadleaf-trees.csv')
conifers = read_simple(1, 'conifers.csv')

species_images = Dir["#{drive}/_Images - SPECIES/**/*.{jpg,jpeg,png,JPG,JPEG,PNG}"]
trait_images = Dir["#{drive}/_Images - TRAITS/**/*.{jpg,jpeg,png,JPG,JPEG,PNG}"]

unmatched_species_images = species_images

all_scientific_names = [shrubs, trees, conifers].flatten.map { |s| s['name'] } + herbsforbs.map { |s| s['Scientific Name'] }
matched_species_images = {}
all_scientific_names.each do |name|
  species_dir = "species/#{name.gsub(' ', '-')}"
  FileUtils.mkdir_p(species_dir)
  regex = /\b#{name.gsub(' ', '[^A-Za-z]+')}\b/i
  matches = species_images.select { |img| img.match(regex) }
  unmatched_species_images -= matches
  converted = matches.map do |img|
    # 0..37 is hack for too-long filenames in android build
    dest = "#{species_dir}/#{File.basename(img, '.*').gsub(' ', '-')[0..37]}.jpg"
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
  k = File.basename(File.dirname(image)).gsub('_', ' ').gsub('-', ' ').downcase
  v = File.basename(image, ".*").gsub('_', ' ').gsub('-', ' ').downcase

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

export const db_herbs_forbs = #{herbsforbs.to_json};
export const db_broadleaf_shrubs = #{shrubs.to_json};
export const db_broadleaf_trees = #{trees.to_json};
export const db_conifers = #{conifers.to_json};

export const species_images = {
#{matched_species_images.each_pair.map do |species, images|
  maps = []
  not_maps = []
  images.each do |image|
    if image.include?('range') || image.include?('WImap')
      maps << image
    else
      not_maps << image
    end
  end
  def requires(ary)
    "[#{ary.map { |image| "require(#{('./' + image).to_json})" }.join(', ')}]"
  end
  "#{species.to_json}: {images: #{requires(not_maps)}, maps: #{requires(maps)}}"
end.join(",\n")}
};

export const trait_images = {
#{matched_trait_images.each_pair.map do |k, vs|
  "#{k.to_json}: {#{
    vs.each_pair.map do |v, file|
      "#{v.to_json}: require(#{('./' + file).to_json})"
    end.join(', ')
  }}"
end.join(",\n")}
};

}
File.write('database.js', js);
