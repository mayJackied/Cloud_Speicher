package com.zuantou.service.impl;

import com.zuantou.pojo.dto.CheckUserNameDTO;
import com.zuantou.pojo.vo.CheckUserNameVO;
import com.zuantou.utils.JwtUtils;
import com.zuantou.utils.UserContext;
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
    public Result<CheckUserNameVO> checkUserName(CheckUserNameDTO checkUserNameDTO) {
        if (userMapper.selectByUserName(checkUserNameDTO.getName()) == null) {
            return Result.success(new CheckUserNameVO(true));
        }
        return Result.success(new CheckUserNameVO(false));
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
        String name = registerDTO.getName();
        if (name == null || name.isBlank()) {
            return Result.error("用户名不能为空");
        }

        if (name.length() < 3 || name.length() > 20) {
            return Result.error("用户名长度必须为3-20位");
        }

        if (!name.matches("^[A-Za-z][A-Za-z0-9_]*$")) {
            return Result.error("用户名必须以字母开头，且只能包含字母、数字和下划线");
        }

        String password = registerDTO.getPassword();
        if (password == null || password.isBlank()) {
            return Result.error("密码不能为空");
        }

        if (password.length() < 8 || password.length() > 64) {
            return Result.error("密码长度必须为8-64位");
        }

        if (!password.matches("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]+$")) {
            return Result.error("密码必须同时包含字母和数字，且只能包含字母和数字");
        }

        String inviteCodeValue = registerDTO.getInviteCode();
        if (inviteCodeValue == null || inviteCodeValue.isBlank()) {
            return Result.error("邀请码不能为空");
        }


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
        User u = userMapper.selectByUserName(loginDTO.getName());
        if (u != null && passwordEncoder.matches(loginDTO.getPassword(), u.getPassword())) {
            LoginVO loginVO = new LoginVO();
            BeanUtils.copyProperties(u, loginVO);


            loginVO.setToken(jwtUtils.generateJwt(Map.of("user_id", loginVO.getUserId())));
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
