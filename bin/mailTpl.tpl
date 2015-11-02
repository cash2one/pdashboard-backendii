<!-- target: mailContent -->
<html>
<head>
<meta charset="utf8">
</head>
<body>
<style>
body{
    font: normal 11px auto "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
    color: #4f6b72;
}
a{
    color: #c75f3e;
}
p{
    font-size: 14px;
}
table{
    padding: 0;
    margin: 0;
}
th{
    font: bold 11px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif;
    color: #4f6b72;
    border-right: 1px solid #C1DAD7;
    border-bottom: 1px solid #C1DAD7;
    border-top: 1px solid #C1DAD7;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: left;
    padding: 6px 6px 6px 12px;
    background: #CAE8EA;
}
td{
    border-right: 1px solid #C1DAD7;
    border-bottom: 1px solid #C1DAD7;
    background: #fff;
    padding: 6px 6px 6px 12px;
    color: #4f6b72;
}
.green{
    color: green;
}
.red{
    color: red;
}
</style>
<h2><a href="http://fcfe.baidu.com:8001/">点此查看图表详情</a></h2>
<!-- for: ${warnResults} as ${warnResult} -->
<div class="mail-warn">
    <p>${warnResult.name}</p>
    <table cellspacing="0">
        <tbody>
            <tr>
                <th>页面</th>
                <th>区域</th>
                <!-- for: ${warnResult.keys} as ${key} -->
                <th>${key}(MS)</th>
                <!-- /for -->
            </tr>
            <!-- for: ${warnResult.value} as ${collData} -->
            <tr class="alt">
                <td rowspan=${collData.length}>
                    ${collData.collName}
                </td>
                <!-- for: ${collData.value} as ${fieldData}, ${fieldIndex} -->
                <!-- if: ${fieldIndex} != 0 -->
            <tr>
                <!-- /if -->
                <td>
                    ${fieldData.field}
                </td>
                <!-- for: ${fieldData.value} as ${value}, ${index} -->
                <td
                <!-- if: ${index} != 1 -->
                class="${fieldData.color}"
                <!-- /if -->
                >${value}</td>
                <!-- /for -->
            </tr>
                <!-- /for -->
            <!-- /for -->
        </tbody>
    </table>
</div>
<!-- /for -->
</body>
</html>
<!-- /target -->
