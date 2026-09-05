package com.zuantou.mapper.file;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zuantou.pojo.StarredFile;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface StarredFileMapper extends BaseMapper<StarredFile> {
    @Select("select * from starred_file where user_id = #{userId}")
    List<StarredFile> selectStarredFilesByUserId(Integer userId);
}
