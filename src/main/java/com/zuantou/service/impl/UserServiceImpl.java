package com.zuantou.service.impl;

import com.zuantou.mapper.InviteCodeMapper;
import com.zuantou.mapper.UserMapper;
import com.zuantou.pojo.InviteCode;
import com.zuantou.pojo.Result;
import com.zuantou.pojo.User;
import com.zuantou.pojo.dto.CreatInviteCodeDTO;
import com.zuantou.pojo.dto.LoginDTO;
import com.zuantou.pojo.dto.RegisterDTO;
import com.zuantou.pojo.vo.CreatInviteCodeVO;
import com.zuantou.pojo.vo.UserVO;
import com.zuantou.service.UserService;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {
    final UserMapper userMapper;
    final InviteCodeMapper inviteCodeMapper;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public Result<Set<String>> selectUserNames() {
        List<User> users = userMapper.selectList(null);
        Set<String> userNames = new HashSet<>();
        for (User user : users) {
            userNames.add(user.getName());
        }

        return new Result<>(1, null, userNames);
    }

    @Override
    public Result<CreatInviteCodeVO> creatInviteCode(CreatInviteCodeDTO creatDTO) {
        User user = userMapper.selectById(creatDTO.getUserId());
        if (user.isAdmin() && !user.isDelete()) {
            String inviteCode = UUID.randomUUID().toString();
            inviteCodeMapper.insert(new InviteCode(inviteCode, false));

            return new Result<>(1, null, new CreatInviteCodeVO(inviteCode));
        }

        return new Result<>(0, "您不是管理员", null);
    }

    @Override
    public Result<UserVO> register(RegisterDTO registerDTO) {

        for (InviteCode inviteCode : inviteCodeMapper.selectList(null)) {
            if (!inviteCode.isDelete() && inviteCode.getInviteCode().equals(registerDTO.getInviteCode())) {
                User u = new User(null, passwordEncoder.encode(registerDTO.getPassword()),registerDTO.getName(), false, null, false);
                userMapper.insert(u);

                inviteCode.setDelete(true);
                inviteCodeMapper.updateById(inviteCode);

                UserVO userVO = new UserVO();
                BeanUtils.copyProperties(u, userVO);

                return new Result<>(1, null, userVO);
            }
        }
        return new Result<>(0, "无效的邀请码", null);
    }

    @Override
    public Result<UserVO> login(LoginDTO loginDTO) {
        User u = userMapper.selectByNameUser(loginDTO.getName());
        if (u != null && passwordEncoder.matches(loginDTO.getPassword(), u.getPassword())) {
            UserVO userVO = new UserVO();
            BeanUtils.copyProperties(u, userVO);

            return new Result<>(1, null, userVO);
        }
        return new Result<>(0, "用户名或密码不正确", null);
    }


    public UserServiceImpl(UserMapper userMapper, InviteCodeMapper inviteCodeMapper) {
        this.userMapper = userMapper;
        this.inviteCodeMapper = inviteCodeMapper;
    }
}
