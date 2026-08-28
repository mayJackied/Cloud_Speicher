package com.zuantou.mapper;


import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zuantou.pojo.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {
    @Select("select * from user WHERE name = #{name}")
    User selectByNameUser(String name);
}
