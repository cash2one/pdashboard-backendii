require "mongo"
require "json"
require "optparse"
require "optparse/date"
require "optparse/time"

options = {}
puts ARGV
OptionParser.new do |opts|
  opts.banner = ""
  options[:path] = "data"
  opts.on("-d", "--date date", Date, "log date") do |d|
    options[:date] = d
  end
  opts.on("-t", "--time time", Time, "log time") do |t|
    options[:time] = t
  end
  opts.on("-p", "--path path", String, "log data path") do |p|
    options[:path] = p
  end
end.parse!
puts ARGV
puts options
options[:datetime] = options[:date].to_datetime if !options[:date].nil?
options[:datetime] = options[:time].to_datetime if !options[:time].nil?
filepath=options[:date].strftime('%Y%m%d') if !options[:date].nil?
filepath=options[:time].strftime('%Y%m%d/%H') if !options[:time].nil?
filepath="#{options[:path]}/#{filepath}/request_stat"
file = File.open(filepath, "r")
device_dict = {
  "1" => "pc",
  "2" => "mobile",
}
doc = file.reduce({}) do |doc, line|
  device, manual, machine = line.split
  doc[device_dict[device]] ||= {}
  doc[device_dict[device]]["adpreview_backend_request_manual"] = manual
  doc[device_dict[device]]["adpreview_backend_request_machine"] = machine
  doc
end.select{|k| !k.nil?}
doc["recordTimestamp"] = (options[:datetime].strftime('%s').to_i - 8 * 3600) * 1000
puts doc

client = Mongo::Client.new(['127.0.0.1:27017'], :database => 'pdashboard', :connect => :direct)
collName = :adpreview_backend_request_stat
collName = :adpreview_backend_request_stat_hourly if !options[:time].nil?
coll = client[collName, :capped => true]
coll.delete_many(:recordTimestamp => doc["recordTimestamp"])
coll.insert_one(doc)
result = coll.find()
puts result

# db = Mongo::Connection.new("localhost", "27017").db("pdashboard")
# db.collection_names.each {|x| puts x}
# coll = db.collection("adpreview_backend_request_stat")
# STDIN.reduce({}) {|doc, line|
#   device, manual, machine = line.split
#   doc[deviceDict[device]] ||= {}
#   doc[deviceDict[device]]["manual"] = manual
#   doc[deviceDict[device]]["machine"] = machine
#   puts JSON.pretty_generate(doc)
#   doc
# }
