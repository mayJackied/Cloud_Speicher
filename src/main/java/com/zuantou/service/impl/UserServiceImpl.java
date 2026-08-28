package com.zuantou.service.impl;

import com.zuantou.Utils.JwtUtils;
import com.zuantou.Utils.UserContext;
import com.zuantou.mapper.InviteCodeMapper;
import com.zuantou.mapper.UserMapper;
import com.zuantou.pojo.InviteCode;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.User;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.LoginVO;
import com.zuantou.service.UserService;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UserServiceImpl implements UserService {
    final UserMapper userMapper;
    final InviteCodeMapper inviteCodeMapper;
    final JwtUtils jwtUtils;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public Result<Set<String>> selectUserNames() {
        List<User> users = userMapper.selectList(null);
        Set<String> userNames = new HashSet<>();
        for (User user : users) {
            userNames.add(user.getName());
        }

        return Result.success(userNames);
    }

    @Override
    public Result<CreatInviteCodeVO> creatInviteCode() {
        User user = userMapper.selectById(UserContext.getUserId());
        if (user.isAdmin() && !user.isDelete()) {
            String inviteCode = UUID.randomUUID().toString();
            inviteCodeMapper.insert(new InviteCode(inviteCode, false));

            return Result.success(new CreatInviteCodeVO(inviteCode));
        }

        return Result.error("您不是管理员");
    }

    @Override
    public Result<LoginVO> register(RegisterDTO registerDTO) {

        for (InviteCode inviteCode : inviteCodeMapper.selectList(null)) {
            if (!inviteCode.isDelete() && inviteCode.getInviteCode().equals(registerDTO.getInviteCode())) {
                User u = new User(null, passwordEncoder.encode(registerDTO.getPassword()),registerDTO.getName(), false, null, false);
                userMapper.insert(u);

                inviteCode.setDelete(true);
                inviteCodeMapper.updateById(inviteCode);

                LoginVO loginVO = new LoginVO();
                BeanUtils.copyProperties(u, loginVO);

                loginVO.setToken(jwtUtils.generateJwt(Map.of("user_id", loginVO.getUserId())));
                return Result.success(loginVO);
            }
        }
        return Result.error("无效的邀请码");
    }

    @Override
    public Result<LoginVO> login(LoginDTO loginDTO) {
        User u = userMapper.selectByNameUser(loginDTO.getName());
        if (u != null && passwordEncoder.matches(loginDTO.getPassword(), u.getPassword())) {
            LoginVO loginVO = new LoginVO();
            BeanUtils.copyProperties(u, loginVO);


            loginVO.setToken(jwtUtils.generateJwt(Map.of("id", loginVO.getUserId())));
            return Result.success(loginVO);
        }
        return Result.error("用户名或密码不正确");
    }


    public UserServiceImpl(UserMapper userMapper, InviteCodeMapper inviteCodeMapper, JwtUtils jwtUtils) {
        this.userMapper = userMapper;
        this.inviteCodeMapper = inviteCodeMapper;
        this.jwtUtils = jwtUtils;
    }
}
