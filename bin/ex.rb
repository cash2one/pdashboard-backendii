#!/usr/bin/ruby

def check_number (x = 13, y = 100) 
  z = 21
  
  if x > 13 # number为空-第一行为total总计
    puts 'x > 13 咯'
  else if y.nil?
	puts 'y居然妹纸'
  else
    z = 999
  end

  return x, y, z
end

check_number(15)
check_number(7)
check_number(8, 9)
check_number(8)
check_number()
