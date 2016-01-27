# 数据文件读取任务
# -
# 数据文件名            所包含属性名                    存储于collectionName（ext:hourly）
# -                     -                               -
# request_stat          人工请求/机器请求/后端请求总数  adpreview_backend_request_stat
# @add by Gu Shouchuang (gushouchuang@baidu.com)
# recall_result         召回率                          adpreview_backend_recall_precision
# precision_result      准确率                          adpreview_backend_recall_precision
# single_strategy_data  单个策略贡献                    adpreview_backend_strategy_contribution
# acc_strategy_data     累计策略贡献                    adpreview_backend_strategy_contribution
# strategy_map          策略名映射                      adpreview_backend_strategy_contribution

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

recordTimestamp = options[:datetime].strftime('%s').to_i * 1000
recordTimestamp = recordTimestamp - (8 * 3600 * 1000) if options[:time].nil?

client = Mongo::Client.new(['127.0.0.1:27017'], :database => 'pdashboard', :connect => :direct)

# 复用以上变量值
# 原有request_stat文件处理逻辑
# collection adpreview_backend_request_stat/adpreview_backend_request_stat_hourly
filepath_stat="#{options[:path]}/#{filepath}/request_stat"
file_stat = File.open(filepath_stat, "r")
device_dict = {
  "1" => "pc",
  "2" => "mobile",
}
doc_stat = file_stat.reduce({}) do |doc, line|
  device, manual, machine = line.split
  doc[device_dict[device]] ||= {}
  doc[device_dict[device]]["adpreview_backend_request_manual"] = manual
  doc[device_dict[device]]["adpreview_backend_request_machine"] = machine
  doc
end.select{|k| !k.nil?}
doc_stat["recordTimestamp"] = recordTimestamp
puts "人工请求/机器请求/后端请求总数"
puts doc_stat

collName_stat = :adpreview_backend_request_stat
collName_stat = :adpreview_backend_request_stat_hourly if !options[:time].nil?
coll_stat = client[collName_stat, :capped => true]
coll_stat.delete_many(:recordTimestamp => doc_stat["recordTimestamp"])
coll_stat.insert_one(doc_stat)
result_stat = coll_stat.find()
puts result_stat

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


# 召回率/准确率
# 数据文件 recall_result/precision_result
# collection adpreview_backend_recall_precision/adpreview_backend_recall_precision_hourly
filepath_recall="#{options[:path]}/#{filepath}/recall_result"
filepath_precision="#{options[:path]}/#{filepath}/precision_result"
file_recall = File.open(filepath_recall, "r")
file_precision = File.open(filepath_precision, "r")

doc_recall = file_recall.reduce({}) do |doc, line|
  molecule, denominator = line.split
  doc["molecule"] = molecule # 分子
  doc["denominator"] = denominator # 分母
  doc
end.select{|k| !k.nil?}
doc_precision = file_precision.reduce({}) do |doc, line|
  molecule, denominator = line.split
  doc["molecule"] = molecule
  doc["denominator"] = denominator
  doc
end.select{|k| !k.nil?}

doc_recall_precision = {
  "recall" => doc_recall, # 召回率
  "precision" => doc_precision, # 准确率
}

doc_recall_precision["recordTimestamp"] = recordTimestamp
puts "召回率/准确率"
puts doc_recall_precision

collName_recall_precision = :adpreview_backend_recall_precision
collName_recall_precision = :adpreview_backend_recall_precision_hourly if !options[:time].nil?
coll_recall_precision = client[collName_recall_precision, :capped => true]
coll_recall_precision.delete_many(:recordTimestamp => doc_recall_precision["recordTimestamp"])
coll_recall_precision.insert_one(doc_recall_precision)
result_recall_precision = coll_recall_precision.find()
puts result_recall_precision

# 单个策略贡献/累计策略贡献/策略名映射
# 数据文件 single_strategy_data/acc_strategy_data/strategy_map
# collection adpreview_backend_strategy_contribution/adpreview_backend_strategy_contribution_hourly
filepath_s_strategy="#{options[:path]}/#{filepath}/single_strategy_data" # 单个
filepath_a_strategy="#{options[:path]}/#{filepath}/acc_strategy_data" # 累计
filepath_n_strategy="#{options[:path]}/#{filepath}/strategy_map" # 策略名
file_s_strategy = File.open(filepath_s_strategy, "r")
file_a_strategy = File.open(filepath_a_strategy, "r")
file_n_strategy = File.open(filepath_n_strategy, "r")

doc_s_strategy = file_s_strategy.reduce({}) do |doc, line|
  id, number = line.split
  if number.nil # number为空-第一行为total总计
    doc["total"] = id
  else
    doc[:id] = number
  end
  doc
end.select{|k| !k.nil?}

doc_a_strategy = file_a_strategy.reduce({}) do |doc, line|
  id, number = line.split
  if number.nil
    doc["total"] = id
  else
    doc[:id] = number
  end
  doc
end.select{|k| !k.nil?}

doc_n_strategy = file_n_strategy.reduce({}) do |doc, line|
  id, name = line.split
  doc[:id] = name
  doc
end.select{|k| !k.nil?}

doc_strategy = {
  "single" => doc_recall, # 单个策略贡献
  "acc" => doc_precision, # 累计策略贡献
  "name" => doc_precision, # 策略名map
}

doc_strategy["recordTimestamp"] = recordTimestamp
puts "单个策略贡献/累计策略贡献/策略名映射"
puts doc_strategy

collName_strategy = :adpreview_backend_strategy_contribution
collName_strategy = :adpreview_backend_strategy_contribution_hourly if !options[:time].nil?
coll_strategy = client[collName_strategy, :capped => true]
coll_strategy.delete_many(:recordTimestamp => doc_strategy["recordTimestamp"])
coll_strategy.insert_one(doc_strategy)
result_strategy = coll_strategy.find()
puts result_strategy

