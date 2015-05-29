
凤巢性能dashboard的后端支持，抓取性能数据并入库。

入口命令：by gushouchuang
node index -f ./pipeline_scripts/\pipeline_performance_keyword_file.json -o {\"dbUrl\":\"mongodb://localhost/performance_GET_data\"\,\"getItemArgs\":[\"fengchao_feview_performance_nirvana_mod_day\"\,\"-o\"\,\"-s\ 20150527\"]}
    
	-f  pipeline文件
	-o  json字符串
	
	-s  数据日期
	-o  下载必须参数
	fengchao_feview_performance_nirvana_mod_day  log服务名