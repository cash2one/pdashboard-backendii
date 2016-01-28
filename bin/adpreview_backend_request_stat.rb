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

# config配置
config = [{
  "title": "人工请求/机器请求/后端请求总数",
  "collName": "adpreview_backend_request_stat",
  "collNameHoruly": "adpreview_backend_request_stat_hourly"
},
{
  "title": "召回率/准确率",
  "collName": "adpreview_backend_recall_precision",
  "collNameHoruly": "adpreview_backend_recall_precision_hourly"
},
{
  "title": "单个策略贡献/累计策略贡献/策略名映射",
  "collName": "adpreview_backend_strategy_contribution",
  "collNameHoruly": "adpreview_backend_strategy_contribution_hourly"
}]

# Function 统一db入库操作 define
# options ruby命令行参数集合
# config 任务参数详情
# recordTimestamp 时间戳
# client db
def db_insert_data (options, config, recordTimestamp, client)
  for value in config
    value["data"]["recordTimestamp"] = recordTimestamp
    puts value["title"] # head
    puts value["data"] # 数据明细

    collName = value["collName"]
    collName = value["collNameHoruly"] if !options[:time].nil?
    coll = client[collName, :capped => true]
    coll.delete_many(:recordTimestamp => recordTimestamp)
    coll.insert_one(value["data"])
    result = coll.find()
    puts result # collection全数据
  end
end


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


# 人工请求/机器请求/后端请求总数
# 数据文件 request_stat
# collection adpreview_backend_request_stat/adpreview_backend_request_stat_hourly
filepath_stat = "#{options[:path]}/#{filepath}/request_stat"
file_stat = File.open(filepath_stat, "r")
device_dict = {
  "1" => "pc",
  "2" => "mobile"
}
config[0]["data"] = file_stat.reduce({}) do |doc, line|
  device, manual, machine = line.split
  doc[device_dict[device]] ||= {}
  doc[device_dict[device]]["adpreview_backend_request_manual"] = manual
  doc[device_dict[device]]["adpreview_backend_request_machine"] = machine
  doc
end.select{|k| !k.nil?}

# 召回率/准确率
# 数据文件 recall_result/precision_result
# collection adpreview_backend_recall_precision/adpreview_backend_recall_precision_hourly
filepath_recall = "#{options[:path]}/#{filepath}/recall_result"
filepath_precision = "#{options[:path]}/#{filepath}/precision_result"
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

config[1]["data"] = {
  "recall" => doc_recall, # 召回率
  "precision" => doc_precision # 准确率
}


# 单个策略贡献/累计策略贡献/策略名映射
# 数据文件 single_strategy_data/acc_strategy_data/strategy_map
# collection adpreview_backend_strategy_contribution/adpreview_backend_strategy_contribution_hourly
filepath_s_strategy = "#{options[:path]}/#{filepath}/single_strategy_data" # 单个
filepath_a_strategy = "#{options[:path]}/#{filepath}/acc_strategy_data" # 累计
filepath_n_strategy = "#{options[:path]}/#{filepath}/strategy_map" # 策略名
file_s_strategy = File.open(filepath_s_strategy, "r")
file_a_strategy = File.open(filepath_a_strategy, "r")
file_n_strategy = File.open(filepath_n_strategy, "r")

# 第一行为total总计
doc_s_strategy = file_s_strategy.reduce({}) do |doc, line|
  id, number = line.split
  doc[id] = number
  doc
end.select{|k| !k.nil?}

doc_a_strategy = file_a_strategy.reduce({}) do |doc, line|
  id, number = line.split
  doc[id] = number
  doc
end.select{|k| !k.nil?}

doc_n_strategy = file_n_strategy.reduce({}) do |doc, line|
  id, name = line.split
  doc[id] = name
  doc
end.select{|k| !k.nil?}

config[2]["data"] = {
  "single" => doc_s_strategy, # 单个策略贡献
  "acc" => doc_a_strategy, # 累计策略贡献
  "name" => doc_n_strategy, # 策略名map
}

# 调用Function 统一入库
db_insert_data(options, config, recordTimestamp, client)