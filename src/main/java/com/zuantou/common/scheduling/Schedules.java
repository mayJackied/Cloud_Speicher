package com.zuantou.common.scheduling;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zuantou.common.jwt.JwtBlacklistMap;
import com.zuantou.common.properties.MyValFileProperties;
import com.zuantou.mapper.file.DeleteBinFileSourceMapper;
import com.zuantou.mapper.file.ShareFileLinkMapper;
import com.zuantou.mapper.user.JwtBlacklistMapper;
import com.zuantou.pojo.DeleteBinFileSource;
import com.zuantou.pojo.JwtBlacklist;
import com.zuantou.pojo.ShareFileLink;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@EnableScheduling
@Configuration
public class Schedules {
    private final DeleteBinFileSourceMapper deleteBinFileSourceMapper;
    private final JwtBlacklistMap jwtBlacklistMap;
    private final JwtBlacklistMapper jwtBlacklistMapper;
    private final MyValFileProperties fileProperties;
    private final ShareFileLinkMapper shareFileMapper;

    public Schedules(DeleteBinFileSourceMapper deleteBinFileSourceMapper, JwtBlacklistMap jwtBlacklistMap, JwtBlacklistMapper jwtBlacklistMapper, MyValFileProperties fileProperties, ShareFileLinkMapper shareFileMapper) {
        this.deleteBinFileSourceMapper = deleteBinFileSourceMapper;
        this.jwtBlacklistMap = jwtBlacklistMap;
        this.jwtBlacklistMapper = jwtBlacklistMapper;
        this.fileProperties = fileProperties;
        this.shareFileMapper = shareFileMapper;
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void removeExpiredJWTs() {
        if (jwtBlacklistMap.blacklists == null || jwtBlacklistMap.blacklists.isEmpty()) {
            return;
        }
        List<String> jwtS = new ArrayList<>();
        Iterator<JwtBlacklist> iterator = jwtBlacklistMap.blacklists.iterator();
        while (iterator.hasNext()) {
            JwtBlacklist blacklist = iterator.next();
            if (blacklist.getExpireTime() <= System.currentTimeMillis()) {
                iterator.remove();
                jwtS.add(blacklist.getJwt());
            }
        }
        if (jwtS.isEmpty()) {
            return;
        }
        jwtBlacklistMapper.deleteByIds(jwtS);
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void removeExpiredBinFiles() {
        deleteBinFileSourceMapper.delete(new LambdaQueryWrapper<DeleteBinFileSource>().le(DeleteBinFileSource::getCreatTime, System.currentTimeMillis() - fileProperties.getRetainTime() * 24 * 60 * 60 * 1000));
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void removeExpiredShareLinks() {
        shareFileMapper.delete(new LambdaQueryWrapper<ShareFileLink>().le(ShareFileLink::getExpireTime, System.currentTimeMillis()));
    }
}
